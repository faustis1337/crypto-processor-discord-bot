const axios = require('axios');
const config = require('../../config');
const LocalStorage = require('node-localstorage').LocalStorage;
const localStoragePath = './localStorage';
let localStorage;
var Web3 = require('web3');
const {all} = require("axios");

const waitHoursForPayment = 24;

try {
    localStorage = new LocalStorage(localStoragePath);
} catch (e) {
    // If the file doesn't exist, create a new one
    localStorage = new LocalStorage(localStoragePath, {create: true});
}

async function getCryptoInfo(symbol) {
    let longName;
    let currentValue;

    switch (symbol) {
        case 'BTC':
            longName = 'Bitcoin';
            currentValue = await getBitcoinRate();
            break;
        case 'ETH':
            longName = 'Ethereum';
            currentValue = await getEthereumRate();
            break;
        case 'LTC':
            longName = 'Litecoin';
            currentValue = await getLitecoinRate();
            break;
        default:
            return null;
    }

    const crypto = {
        longName: longName,
        currentValue: currentValue,
    };
    return crypto;
}

async function findBitcoinTransaction(paymentInfo) {
    const requiredAmount = paymentInfo.value;
    const startTimeEpoch = paymentInfo.startPaymentCreationEpoch;
    const address = paymentInfo.address;
    const apiUrl = `https://blockstream.info/api/address/${address}/txs`;
    const endTimeEpoch = getEndEpochTime(startTimeEpoch);

    const foundExistingTransactionHash = findStoredTransactionHash(paymentInfo.token, paymentInfo.id);
    if (foundExistingTransactionHash) {
        return fetch(apiUrl)
            .then(response => response.json())
            .then(txs => {
                const tx = txs.find(tx => tx.txid == foundExistingTransactionHash);
                return tx ? {hash: tx.txid, confirmations: tx.status.confirmed ? 1 : 0} : null;
            });
    }

    const allTransactions = await fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const allPossibleTransactions = [];

            const transactions = data.filter(tx => {
                const timeOffset = 300;
                return (tx.status.block_time + timeOffset >= startTimeEpoch && tx.status.block_time <= endTimeEpoch) || tx.status.block_time == null;
            });
            for (let i = 0; i < transactions.length; i++) {
                const myTransaction = transactions[i].vout.find(vout => vout.scriptpubkey_address == address && (vout.value / 100000000) == requiredAmount);
                if (myTransaction != null) {
                    allPossibleTransactions.push({
                        hash: transactions[i].txid,
                        confirmations: transactions[i].status.confirmed ? 1 : 0,
                    });
                }
            }

            return allPossibleTransactions;
        });
    return allTransactions?.length > 0 ? getUnclaimedTransaction(allTransactions, paymentInfo) : null;
}


async function findEthereumTransaction(paymentInfo) {
    const cryptoAmount = paymentInfo.value;
    const startTimeEpoch = paymentInfo.startPaymentCreationEpoch;
    const address = paymentInfo.address;
    const apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=G3GC5UTPQ85ETUGW6X7QR85PD4W8BYM9VA`;
    const endTimeEpoch = getEndEpochTime(startTimeEpoch);

    const foundExistingTransactionHash = findStoredTransactionHash(paymentInfo.token, paymentInfo.id);
    if (foundExistingTransactionHash) {
        return await fetch(apiUrl).then(response => response.json()).then(data => {
            const tx = data.result.find(tx => tx.hash == foundExistingTransactionHash);
            return tx ? {hash: tx.hash, confirmations: tx.confirmations,} : null;
        });
    }

    const transactionList = await fetch(apiUrl).then(response => response.json()).then(data => {
        return data.result.filter(tx => {
            const timeOffset = 300;
            const isTimeValid = (tx.timeStamp + timeOffset >= startTimeEpoch && tx.timeStamp <= endTimeEpoch);
            const isAmountCorrect = Web3.utils.toWei(cryptoAmount, 'ether') == tx.value;
            return isTimeValid && isAmountCorrect;
        });
    });

    return transactionList?.length > 0 ? getUnclaimedTransaction(transactionList, paymentInfo) : null;
}

async function findLitecoinTransaction(paymentInfo) {
    const requiredAmount = paymentInfo.value;
    const startTimeEpoch = paymentInfo.startPaymentCreationEpoch;
    const address = paymentInfo.address;
    const apiUrl = `https://api.blockcypher.com/v1/ltc/main/addrs/${address}`;
    const endTimeEpoch = getEndEpochTime(startTimeEpoch);

    const foundExistingTransactionHash = findStoredTransactionHash(paymentInfo.token, paymentInfo.id);
    if (foundExistingTransactionHash != null) {
        return await fetch(apiUrl).then(response => response.json()).then(data => {
            const transactions = [].concat(data.txrefs, data.unconfirmed_txrefs);
            const tx = transactions.find(tx => tx.tx_hash == foundExistingTransactionHash);
            return tx ? {hash: tx.tx_hash, confirmations: tx.confirmations} : null;
        });
    }

    const transactionsFound = await fetch(apiUrl).then(response => response.json()).then(data => {
        let allTransactions = [...(data.unconfirmed_txrefs ?? []), ...(data.txrefs ?? [])];

        return allTransactions.filter(tx => {
            const dateEpoch = (Date.parse(tx.received ?? tx.confirmed) / 1000) || null;
            if (dateEpoch == null) return false;

            const timeOffset = 300;
            const isTimeValid = ((dateEpoch + timeOffset >= startTimeEpoch) && (dateEpoch <= endTimeEpoch));
            const input = (tx.tx_input_n == -1);
            const isAmountCorrect = (requiredAmount == (tx.value / 100000000));

            return isTimeValid && input && isAmountCorrect;
        }).map(transaction => ({
            hash: transaction.tx_hash,
            confirmations: transaction.confirmations,
        }));
    });

    return transactionsFound ? getUnclaimedTransaction(transactionsFound, paymentInfo) : null;
}

function findStoredTransactionHash(token, id) {
    let storedTransactionsFileName = storedTransactionsFileNameFactory(token);
    if (storedTransactionsFileName == null) return null;

    const storedItemList = localStorage.getItem(storedTransactionsFileName);
    const storedTransactions = storedItemList ? JSON.parse(storedItemList) : [];

    const transactionFound = storedTransactions.find(storedTx => storedTx.id == id);

    return transactionFound?.hash || null;
}


function getUnclaimedTransaction(transactionList, paymentInfo) {
    let storedTransactionsFileName = storedTransactionsFileNameFactory(paymentInfo.token);

    if (transactionList == null || storedTransactionsFileName == null) return null;

    const storedItemList = localStorage.getItem(storedTransactionsFileName);
    const storedTransactions = storedItemList ? JSON.parse(storedItemList) : [];

    let transactionToUse;
    transactionToUse = transactionList.find(transaction => {
        return storedTransactions.some(storedTx => storedTx.hash == transaction.hash && storedTx.id == paymentInfo.id);
    });

    if (transactionToUse == null) {
        transactionToUse = transactionList.find(transaction => {
            if (storedTransactions.some(tx => tx.hash == transaction.hash) == false) {
                storedTransactions.push({id: paymentInfo.id, hash: transaction.hash});
                localStorage.setItem(storedTransactionsFileName, JSON.stringify(storedTransactions));
                return true;
            }
        });
    }

    return transactionToUse ? {hash: transactionToUse.hash, confirmations: transactionToUse.confirmations} : null;
}

function storedTransactionsFileNameFactory(token) {
    let storedTransactionsFileName = null;
    switch (token) {
        case 'BTC':
            storedTransactionsFileName = 'btcTransactions';
            break;
        case 'ETH':
            storedTransactionsFileName = 'ethTransactions';
            break;
        case 'LTC':
            storedTransactionsFileName = 'ltcTransactions';
            break;
    }
    return storedTransactionsFileName;
}

function saveCryptoAddress(token, address) {
    const fileName = 'cryptoAddresses';
    const addressesFile = localStorage.getItem(fileName);

    let cryptoAdressesObject = addressesFile ? JSON.parse(addressesFile) : null;

    if (cryptoAdressesObject == null) {
        cryptoAdressesObject =
            {
                [token]: address
            }
    } else {
        cryptoAdressesObject[token] = address;
    }
    localStorage.setItem(fileName, JSON.stringify(cryptoAdressesObject));
}

function getCryptoAddress(token) {
    const fileName = 'cryptoAddresses';
    const addressesFile = localStorage.getItem(fileName);

    let cryptoAdressesObject = addressesFile ? JSON.parse(addressesFile) : null;
    if (cryptoAdressesObject == null) return null;
    return cryptoAdressesObject[token];
}

function getCryptoAddresses() {
    const fileName = 'cryptoAddresses';
    const addressesFile = localStorage.getItem(fileName);

    let cryptoAdressesObject = addressesFile ? JSON.parse(addressesFile) : null;
    return cryptoAdressesObject;
}

function getEndEpochTime(startEpochTime) {
    return parseInt(startEpochTime) + (60 * 60) * waitHoursForPayment;
}

async function getEthereumRate() {
    const ethResponse = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    );
    const ethRate = ethResponse.data.ethereum.usd;
    return ethRate;
}

async function getLitecoinRate() {
    const ltcResponse = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd',
    );
    const ltcRate = ltcResponse.data.litecoin.usd;
    return ltcRate;
}

async function getBitcoinRate() {
    const btcResponse = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    );
    const btcRate = btcResponse.data.bitcoin.usd;
    return btcRate;
}


module.exports = {
    getCryptoInfo,
    findBitcoinTransaction,
    findEthereumTransaction,
    findLitecoinTransaction,
    saveCryptoAddress,
    getCryptoAddress,
    getCryptoAddresses
};