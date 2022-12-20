const ethers = require('ethers');
const EthDater = require("./block-by-date.js");
const keys = require('./keys.json');
const contractInfo = require('./contract.json');
const urlSendEmails = 'http://192.168.1.185:8080/emails/';
const alchemyProvider = new ethers.providers.AlchemyProvider("goerli", keys.ALCHEMY_API_KEY);
const signer = new ethers.Wallet(keys.GOERLI_PRIVATE_KEY, alchemyProvider);
const contract = new ethers.Contract(contractInfo.CONTRACT_ADDRESS, contractInfo.CONTRACT_ABI, signer);
var firstBlockNumber = null;

/**
 * Donne les consentements d'un utilisateur à une date donnée
 *
 * @param {int} id
 * @param {int} date
 */
exports.getConsent = async id => {
	try {
		const data = await contract.getConsent(id);
		return { id: data[0], email: data[1], username: data[2], gender: data[3], timestamp: data[4] };

	} catch (err) {
		return err;
	}
}

 /**
  * Donne la taille de la liste des consentements
  *
  * @param {int} date
  */
exports.getSize = async (date = null) => {
	try {
		var size;
	    if (date === null) {
			size = await contract.getSize();

		} else {
            const dater = new EthDater(await alchemyProvider);
			const blockNumber = await dater.getDate(date / 1000, true);
			if (firstBlockNumber == null) {
				firstBlockNumber = parseInt(await contract.getFirstBlockNumber());
			}
			if (blockNumber < firstBlockNumber) {
				size = await contract.getSize({ blockTag: firstBlockNumber });

			} else {
				size = await contract.getSize({ blockTag: blockNumber });
			}
		}
		return { size: size };

	} catch (err) {
		return err;
	}
}

/**
 * Donne tous les consentements entre deux index
 *
 * @param {int} from l'index du début
 * @param {int} to l'index de fin
 * @param {int} date
 */
exports.getAllConsent = async (from, to, date = null) => {
	try {
		var list;
	    if (date === null) {
			list = await contract.getAllConsent(from, to);

		} else {
            const dater = new EthDater(await alchemyProvider);
			const blockNumber = await dater.getDate(date / 1000, true);
			if (firstBlockNumber == null) {
				firstBlockNumber = parseInt(await contract.getFirstBlockNumber());
			}
			if (blockNumber < firstBlockNumber) {
				list = await contract.getAllConsent(from, to, { blockTag: firstBlockNumber });

			} else {
				list = await contract.getAllConsent(from, to, { blockTag: blockNumber });
			}
		}
		return { list: list };

	} catch (err) {
		return err;
	}
};

/**
 * Ajoute ou modifie les consentements d'un utilisateur, ainsi que son timestamp
 *
 * @param {int} id
 * @param {bool} emailConsent
 * @param {bool} usernameConsent
 * @param {bool} genderConsent
 * @param {int} timestamp le temps après lequel le consentement d'envoi d'email devient "false"
 */
exports.setConsent = async (id, emailConsent, usernameConsent, genderConsent, timestamp) => {
	const gasLimit = await contract.estimateGas.setConsent(id, emailConsent, usernameConsent, genderConsent, timestamp);
	const feeData = await alchemyProvider.getFeeData();
    const setConsentTx = await contract.setConsent(id, emailConsent, usernameConsent, genderConsent, timestamp, {
		nonce: await signer.getTransactionCount("pending"),
		maxPriorityFeePerGas : feeData.maxPriorityFeePerGas,
		maxFeePerGas : feeData.maxFeePerGas,
		gasLimit: gasLimit,
		value: '0x00',
	});
	await setConsentTx.wait();
}

/**
 * Indique au contrat intelligent d'envoyer au serveur de stockage les consentements à "true" sur l'email
 *
 */
exports.prepareEmails = async _=> {
	const gasLimit = await contract.estimateGas.sendEmail(urlSendEmails, contractInfo.OPERATOR_ADDRESS, contractInfo.JOB_ID);
	const feeData = await alchemyProvider.getFeeData();
    const sendEmailTx = await contract.sendEmail(urlSendEmails, contractInfo.OPERATOR_ADDRESS, contractInfo.JOB_ID, {
		nonce: await signer.getTransactionCount("pending"),
		maxPriorityFeePerGas : feeData.maxPriorityFeePerGas,
		maxFeePerGas : feeData.maxFeePerGas,
		gasLimit: gasLimit,
		value: '0x00',
	});
	await sendEmailTx.wait();
}

/**
 * Supprime les consentements d'un utilisateur
 *
 * @param {int} id
 */
exports.deleteConsent = async id => {
	const gasLimit = await contract.estimateGas["deleteConsent(uint64)"](id);
	const feeData = await alchemyProvider.getFeeData();
    const deleteConsentTx = await contract["deleteConsent(uint64)"](id, {
		nonce: await signer.getTransactionCount("pending"),
		maxPriorityFeePerGas : feeData.maxPriorityFeePerGas,
		maxFeePerGas : feeData.maxFeePerGas,
		gasLimit: gasLimit,
		value: '0x00',
	});
	await deleteConsentTx.wait();
}

/**
 * Supprime tous les consentements d'un utilisateur (pour les tests)
 *
 */
exports.deleteAll = async _=> {
	const gasLimit = await contract.estimateGas.deleteAll();
	const feeData = await alchemyProvider.getFeeData();
    const deleteConsentTx = await contract.deleteAll({
		nonce: await signer.getTransactionCount("pending"),
		maxPriorityFeePerGas : feeData.maxPriorityFeePerGas,
		maxFeePerGas : feeData.maxFeePerGas,
		gasLimit: gasLimit,
		value: '0x00',
	});
	await deleteConsentTx.wait();
}
