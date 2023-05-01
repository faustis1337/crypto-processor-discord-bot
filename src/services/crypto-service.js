const axios = require('axios');
const config = require('../../config');
const LocalStorage = require('node-localstorage').LocalStorage;
const localStoragePath = './localStorage';
let localStorage;
var Web3 = require('web3');

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
    const allTransactions = await fetch(apiUrl)
        .then(response => response.json())
        .then(data => {

            const allPossibleTransactions = [];
            const transactions = data.filter(tx => tx.status.block_time >= startTimeEpoch && tx.status.block_time <= endTimeEpoch);
            for (let i = 0; i < transactions.length; i++) {
                const myTransaction = transactions[i].vout.find(vout => vout.scriptpubkey_address == address && (vout.value / 100000000) == requiredAmount);
                if (myTransaction != null) {
                    allPossibleTransactions.push({
                        hash: transactions[i].txid,
                        confirmations: transactions[i].status.confirmed ? 1 : 0,
                    });
                }
            }

            const unconfirmedTransactions = data.filter(tx => tx.status.block_time == null);
            for (let i = 0; i < unconfirmedTransactions.length; i++) {
                const myTransaction = unconfirmedTransactions[i].vout.find(vout => vout.scriptpubkey_address === address && (vout.value / 100000000) == requiredAmount);
                if (myTransaction != null) {
                    allPossibleTransactions.push({
                        hash: unconfirmedTransactions[i].txid,
                        confirmations: unconfirmedTransactions[i].status.confirmed ? 1 : 0,
                    });
                }
            }
            return allPossibleTransactions;
        });
    if (allTransactions != null && allTransactions.length > 0) {
        return getUnclaimedTransaction(allTransactions, paymentInfo);
    }
    return null;
}


async function findEthereumTransaction(paymentInfo) {
    const cryptoAmount = paymentInfo.value;
    const startTimeEpoch = paymentInfo.startPaymentCreationEpoch;
    const address = paymentInfo.address;
    const apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=G3GC5UTPQ85ETUGW6X7QR85PD4W8BYM9VA`;
    const endTimeEpoch = getEndEpochTime(startTimeEpoch);
    const transactionList = await fetch(apiUrl).then(response => response.json()).then(data => {
        return data.result.filter(tx => tx.timeStamp >= startTimeEpoch && tx.timeStamp <= endTimeEpoch && Web3.utils.toWei(cryptoAmount, 'ether') == tx.value);
    });
    console.log(transactionList);
    if (transactionList != null && transactionList.length > 0) {
        return getUnclaimedTransaction(transactionList, paymentInfo);
    }

    return null;
}

async function findLitecoinTransaction(paymentInfo) {
    const requiredAmount = paymentInfo.value;
    const startTimeEpoch = paymentInfo.startPaymentCreationEpoch;
    const address = paymentInfo.address;
    const apiUrl = `https://api.blockcypher.com/v1/ltc/main/addrs/${address}`;
    const endTimeEpoch = getEndEpochTime(startTimeEpoch);


    const transactionsFound = await fetch(apiUrl).then(response => response.json()).then(data => {
        const unconfirmedTransactions = data.unconfirmed_txrefs;
        if (unconfirmedTransactions != null && unconfirmedTransactions.length > 0) {
            const myTransactions = unconfirmedTransactions.filter(tx => {
                if (tx.received == null) return false;
                const dateEpoch = Date.parse(tx.received) / 1000;

                const isRequiredAmount = requiredAmount == (tx.value / 100000000);
                const isCorrectInput = tx.tx_input_n == -1;
                const isInTimeframe = (dateEpoch >= startTimeEpoch) && (dateEpoch <= endTimeEpoch);

                return isRequiredAmount && isCorrectInput && isInTimeframe;
            });
            if (myTransactions != null && myTransactions.length > 0) {
                return myTransactions;
            }
        }
        const confirmedTransactions = data.txrefs;
        if (confirmedTransactions != null && confirmedTransactions.length > 0) {
            const myTransactions = confirmedTransactions.filter(tx => {

                if (tx.confirmed == null) return false;
                const dateEpoch = Date.parse(tx.confirmed) / 1000;

                const isRequiredAmount = requiredAmount == (tx.value / 100000000);
                const isCorrectInput = tx.tx_input_n == -1;
                const isInTimeframe = (dateEpoch >= startTimeEpoch) && (dateEpoch <= endTimeEpoch);

                return isRequiredAmount && isCorrectInput && isInTimeframe;
            });
            if (myTransactions != null && myTransactions.length > 0) {
                return myTransactions;
            }
        }
    });
    if (transactionsFound != null) {
        const remappedTransactions = transactionsFound.map(transaction => {
            return {
                hash: transaction.tx_hash,
                confirmations: transaction.confirmations,
            };
        });
        return getUnclaimedTransaction(remappedTransactions, paymentInfo);
    }

    return null;
}

function getUnclaimedTransaction(transactionList, paymentInfo) {
    if (transactionList == null) return null;
    let storedTransactionsFileName = null;
    switch (paymentInfo.token) {
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
    if (storedTransactionsFileName == null) return null;
    const storedItemList = localStorage.getItem(storedTransactionsFileName);
    const ltcStoredTransactions = storedItemList ? JSON.parse(storedItemList) : [];

    let transactionToUse;
    transactionToUse = transactionList.find(transaction => {
        return ltcStoredTransactions.some(storedTx => storedTx.hash == transaction.hash && storedTx.id == paymentInfo.id);
    });
    if (transactionToUse != null) {
        return {hash: transactionToUse.hash, confirmations: transactionToUse.confirmations};
    }


    if (transactionToUse == null) {
        transactionToUse = transactionList.find(transaction => {
            if (ltcStoredTransactions.some(tx => tx.hash == transaction.hash) == false) {
                ltcStoredTransactions.push({id: paymentInfo.id, hash: transaction.hash});
                localStorage.setItem(storedTransactionsFileName, JSON.stringify(ltcStoredTransactions));
                return true;
            }
        });
    }
    if (transactionToUse != null) {
        console.log('available not used transaction found');
        return {hash: transactionToUse.hash, confirmations: transactionToUse.confirmations};
    }

    // if (transactionToUse != null) {
    // 	return { hash: transactionToUse.hash, confirmations: transactionToUse.confirmations };
    // };
    return null;
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