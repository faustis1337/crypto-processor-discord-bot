function generateId() {
    let id = '';
    const digits = '0123456789';
    for (let i = 0; i < 30; i++) {
        const index = Math.floor(Math.random() * digits.length);
        id += digits[index];
    }
    return id;
}

module.exports = {
    generateId,
};
