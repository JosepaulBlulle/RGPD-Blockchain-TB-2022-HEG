const ethers = require('ethers');
const EthDater = require("./block-by-date.js");
const keys = require('./keys.json');
const contractInfo = require('./contract.json');
const urlCallBack = 'http://192.168.1.185:8081/requestData/';
const alchemyProvider = new ethers.providers.AlchemyProvider("goerli", keys.ALCHEMY_API_KEY);
const signer = new ethers.Wallet(keys.GOERLI_PRIVATE_KEY, alchemyProvider);
const contract = new ethers.Contract(contractInfo.CONTRACT_ADDRESS, contractInfo.CONTRACT_ABI, signer);
var firstBlockNumber = null;

/**
 * Donne la taille de la liste des autorisations
 *
 * @param {int} date
 */
exports.getSize = async (date = null) => {
   try {
	   var size;
	   if (date == null) {
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
 * Donne tous les autorisations entre deux index
 *
 * @param {int} from l'index du début
 * @param {int} to l'index de fin
 * @param {int} date
 */
exports.getAllAuthorization = async (from, to, date = null) => {
	try {
		var list;
	    if (date == null) {
			list = await contract.getAllAuthorization(from, to);

		} else {
            const dater = new EthDater(await alchemyProvider);
			const blockNumber = await dater.getDate(date / 1000, true);
			if (firstBlockNumber == null) {
				firstBlockNumber = parseInt(await contract.getFirstBlockNumber());
			}
			if (blockNumber < firstBlockNumber) {
				list = await contract.getAllAuthorization(from, to, { blockTag: firstBlockNumber });

			} else {
				list = await contract.getAllAuthorization(from, to, { blockTag: blockNumber });
			}
		}
		return { list: list };

	} catch (err) {
		return err;
	}
};

/**
 * Ajoute une autorisation sur le contrat intelligent
 *
 * @param {int} idOrder Id de la commande
 * @param {int} idDeliverer Id du livreur
 * @param {int} timestamp Temps auquel l'autorisation prend fin
 */
exports.addAuthorization = async (idOrder, idDeliverer, timestamp) => {
	const gasLimit = await contract.estimateGas.addAuthorization(idOrder, idDeliverer, timestamp);
	const feeData = await alchemyProvider.getFeeData();
    const addAuthorizationTx = await contract.addAuthorization(idOrder, idDeliverer, timestamp, {
		nonce: await signer.getTransactionCount("pending"),
		maxPriorityFeePerGas : feeData.maxPriorityFeePerGas,
		maxFeePerGas : feeData.maxFeePerGas,
		gasLimit: gasLimit,
		value: '0x00',
	});
	await addAuthorizationTx.wait();
}

/**
 * Change le livreur d'une autorisation sur le contrat intelligent
 *
 * @param {int} idOrder Id de la commande
 * @param {int} idDeliverer Id du livreur
 */
exports.changeDelivererAuthorization = async (idOrder, idDeliverer) => {
	const gasLimit = await contract.estimateGas.changeDelivererAuthorization(idOrder, idDeliverer);
	const feeData = await alchemyProvider.getFeeData();
    const changeDelivererAuthorizationTx = await contract.changeDelivererAuthorization(idOrder, idDeliverer, {
		nonce: await signer.getTransactionCount("pending"),
		maxPriorityFeePerGas : feeData.maxPriorityFeePerGas,
		maxFeePerGas : feeData.maxFeePerGas,
		gasLimit: gasLimit,
		value: '0x00',
	});
	await changeDelivererAuthorizationTx.wait();
}

/**
 * Supprime toutes les autorisations du contrat intelligent qui ont leur id sur la liste passée en paramètre
 *
 * @param {int[]} listIdOrder Liste des id des commandes à supprimer
 */
exports.deleteAuthorization = async listIdOrder => {
	var deleteAuthorizationTx;

	if (typeof listIdOrder == "number") {
		const gasLimit = await contract.estimateGas["deleteAuthorization(uint64)"](listIdOrder);
		const feeData = await alchemyProvider.getFeeData();
	    deleteAuthorizationTx = await contract["deleteAuthorization(uint64)"](listIdOrder, {
			nonce: await signer.getTransactionCount("pending"),
			maxPriorityFeePerGas : feeData.maxPriorityFeePerGas,
			maxFeePerGas : feeData.maxFeePerGas,
			gasLimit: gasLimit,
			value: '0x00',
		});

	} else {
		const gasLimit = await contract.estimateGas["deleteAuthorization(uint64[])"](listIdOrder);
		const feeData = await alchemyProvider.getFeeData();
	    deleteAuthorizationTx = await contract["deleteAuthorization(uint64[])"](listIdOrder, {
			nonce: await signer.getTransactionCount("pending"),
			maxPriorityFeePerGas : feeData.maxPriorityFeePerGas,
			maxFeePerGas : feeData.maxFeePerGas,
			gasLimit: gasLimit,
			value: '0x00',
		});
	}
	const deleteAuthorizationTxRc = await deleteAuthorizationTx.wait();
	return deleteAuthorizationTxRc.events[0].args[0];
}

/**
 * Demande au contrat intelligent d'envoyer la requête de demande de données d'un client pour une commande
 *
 * @param {int} idOrder Id de la commande
 * @param {int} idDeliverer Id du livreur
 */
exports.sendData = async (idOrder, idDeliverer) => {
	// TODO : catch require()
	const gasLimit = await contract.estimateGas.sendData(idOrder, idDeliverer, urlCallBack, contractInfo.OPERATOR_ADDRESS, contractInfo.JOB_ID);
	const feeData = await alchemyProvider.getFeeData();
	const sendDataTx = await contract.sendData(idOrder, idDeliverer, urlCallBack, contractInfo.OPERATOR_ADDRESS, contractInfo.JOB_ID, {
		nonce: await signer.getTransactionCount("pending"),
		maxPriorityFeePerGas : feeData.maxPriorityFeePerGas,
		maxFeePerGas : feeData.maxFeePerGas,
		gasLimit: gasLimit,
		value: '0x00',
	});
	await sendDataTx.wait();
};

/**
 * Supprime toutes les données du contrat intelligent
 *
 */
exports.deleteAll = async _=> {
	const gasLimit = await contract.estimateGas.deleteAll();
	const feeData = await alchemyProvider.getFeeData();
	const deleteAllTx = await contract.deleteAll({
		nonce: await signer.getTransactionCount("pending"),
		maxPriorityFeePerGas : feeData.maxPriorityFeePerGas,
		maxFeePerGas : feeData.maxFeePerGas,
		gasLimit: gasLimit,
		value: '0x00',
	});
	await deleteAllTx.wait();
};
