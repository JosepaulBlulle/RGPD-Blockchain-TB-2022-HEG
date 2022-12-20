/**
 * Class permetant de récuérer un bloc en donnant comme paramètre une date
 *
 * @constructor {*} provider
 */
module.exports = class {
    constructor(provider) {
        this.provider = provider;
        this.checkedBlocks = {};
        this.savedBlocks = {};
        this.requests = 0;
    }

    async getBoundaries() {
        this.latestBlock = await this.getBlockWrapper('latest');
        this.firstBlock = await this.getBlockWrapper(1);
        this.blockTime = (parseInt(this.latestBlock.timestamp, 10) - parseInt(this.firstBlock.timestamp, 10)) / (parseInt(this.latestBlock.number, 10) - 1);
    }

    /**
     * Permet de récuérer un bloc en donnant comme paramètre une date
     *
     * @param {int} timestamp
     * @param {bool} after
     * @param {bool} refresh
     */
    async getDate(timestamp, after = true, refresh = false) {
        if (new Date(timestamp).getTime > 0) return 0;
        if (typeof this.firstBlock == 'undefined' || typeof this.latestBlock == 'undefined' || typeof this.blockTime == 'undefined' || refresh) await this.getBoundaries();
        if (timestamp < this.firstBlock.timestamp) return 1;
        if (timestamp >= this.latestBlock.timestamp) return this.latestBlock.number;
        this.checkedBlocks[timestamp] = [];
        let predictedBlock = await this.getBlockWrapper(Math.ceil((timestamp - this.firstBlock.timestamp) / this.blockTime));
        return await this.findBetter(timestamp, predictedBlock, after);
    }

    async getEvery(duration, start, end, every = 1, after = true, refresh = false) {
        let current = start, timestamps = [];
        while (current.isSameOrBefore(end)) {
            timestamps.push(current.format());
            current.add(every, duration);
        }
        if (typeof this.firstBlock == 'undefined' || typeof this.latestBlock == 'undefined' || typeof this.blockTime == 'undefined' || refresh) await this.getBoundaries();
        return await Promise.all(timestamps.map((timestamp) >= this.getDate(timestamp, after)));
    }

    async findBetter(timestamp, predictedBlock, after, blockTime = this.blockTime) {
        if (await this.isBetterBlock(timestamp, predictedBlock, after)) return predictedBlock.number;
        let difference = (timestamp - predictedBlock.timestamp);
        let skip = Math.ceil(difference / (blockTime == 0 ? 1 : blockTime));
        if (skip == 0) skip = difference < 0 ? -1 : 1;
        let nextPredictedBlock = await this.getBlockWrapper(this.getNextBlock(timestamp, predictedBlock.number, skip));
        blockTime = Math.abs(
            (parseInt(predictedBlock.timestamp, 10) - parseInt(nextPredictedBlock.timestamp, 10)) /
            (parseInt(predictedBlock.number, 10) - parseInt(nextPredictedBlock.number, 10))
        );
        return this.findBetter(timestamp, nextPredictedBlock, after, blockTime);
    }

    async isBetterBlock(timestamp, predictedBlock, after) {
        let blockTime = predictedBlock.timestamp;
        if (after) {
            if (blockTime < timestamp) return false;
            let previousBlock = await this.getBlockWrapper(predictedBlock.number - 1);
            if (blockTime >= timestamp && previousBlock.timestamp < timestamp) return true;

        } else {
            if (blockTime >= timestamp) return false;
            let nextBlock = await this.getBlockWrapper(predictedBlock.number + 1);
            if (blockTime < timestamp && nextBlock.timestamp >= timestamp) return true;
        }
        return false;
    }

    getNextBlock(timestamp, currentBlock, skip) {
        let nextBlock = currentBlock + skip;
        if (nextBlock > this.latestBlock.number) nextBlock = this.latestBlock.number;
        if (this.checkedBlocks[timestamp].includes(nextBlock)) return this.getNextBlock(timestamp, currentBlock, (skip < 0 ? --skip : ++skip));
        this.checkedBlocks[timestamp].push(nextBlock);
        return nextBlock < 1 ? 1 : nextBlock;
    }

    async getBlockWrapper(block) {
        if (this.savedBlocks[block]) return this.savedBlocks[block];
        const test = await this.provider.getBlock(block);
        const { number, timestamp } = await this.provider.getBlock(block);
        this.savedBlocks[number] = {
            timestamp,
            number
        };
        this.requests++;
        return this.savedBlocks[number];
    }
};
