function getEpochTimestamp(timezone) {
    const now = new Date();
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return Math.floor(localTime.getTime() / 1000);
}

module.exports = {
    getEpochTimestamp,
};
