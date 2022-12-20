// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title Contrat Scenario 2
 * @notice Donner la possiblité à nos livreurs d'accéder aux données des clients qu'ils livrent uniquement
 * @author Blülle Celado
 */
contract ContratScenario2 is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    // Chainlink variables
    // 0, car nous sommes aussi l'opérateur
    uint256 private constant ORACLE_PAYMENT = (0 * LINK_DIVISIBILITY) / 10; // 0,1 * 10**18 (Varies by network and job);

    // Others variables
    struct Authorization {
        uint64 idOrder;
        uint64 idDeliverer;
        uint64 timestamp;
    }
    uint64 private immutable FIRST_BLOCK_NUMBER;
    uint64[] private list_idOrder;
    mapping (uint64 => Authorization) private map_authorization;
    string private constant FINALITY = "Donner aux bons livreurs les donnees des clients relatif a leur commande, comme l'adresse, le code de la porte, le numero de telephone, etc.";

    // Events
    event RequestFirstId(bytes32 indexed requestId, string result);
    event DeleteAuthorization(bool deleted);

    /**
     * @notice Initialise le jeton "Link"
     * Goerli Testnet
     * Jeton Link : 0x326C977E6efc84E512bB9C30f76E30c160eD06FB
     */
    constructor() ConfirmedOwner(msg.sender) {
        FIRST_BLOCK_NUMBER = uint64(block.number);
        setChainlinkToken(0x326C977E6efc84E512bB9C30f76E30c160eD06FB);
    }

     /**
     * @notice Fonction qui crée un nombre conséquent d'autorisation pour des tests
     * @param nb Nombre d'autorisation à rajouter (modifier ceux qui existe déjà aussi)
     */
    function testAddAutorization(uint64 nb) onlyOwner external {
        for (uint64 i = 1; i < nb; ++i) {
            list_idOrder.push(i);
            map_authorization[i] = Authorization(i, 1, uint64(block.timestamp + (60 * 2))); // se terminent dans 2 minutes
        }
    }

    /**
     * @notice Donne la finalité de ce contrat
     * @return La finalité de se contrat
     */
    function getFinality() external pure returns(string memory) {
        return FINALITY;
    }

    /**
     * @notice Donne la taille de la liste des autorisations
     * @return La taille
     */
    function getSize() onlyOwner external view returns(uint256) {
        return list_idOrder.length;
    }

    /**
     * @notice Donne le numéro du premier bloc lors du déploiement
     * @return Le numéro du bloc
     */
    function getFirstBlockNumber() external view returns(uint64) {
        return FIRST_BLOCK_NUMBER;
    }

    /**
     * @notice Supprime toutes les données du contrat intelligent
     */
    function deleteAll() onlyOwner external {
        uint64 length = uint64(list_idOrder.length);
        for (uint64 i = length; i > 0;) {
            --i;
            delete map_authorization[list_idOrder[i]];
            list_idOrder.pop();
        }
    }

    /**
     * @notice Ajoute une autorisation pour une commande à un livreur
     * @param idOrder L'id de la commande
     * @param idDeliverer L'id du livreur
     * @param timestamp Temps auquel l'autorisation se termine
     */
    function addAuthorization(uint64 idOrder, uint64 idDeliverer, uint64 timestamp) onlyOwner external {
        require(idOrder > 0 && idDeliverer > 0, "Id <= 0");
        //require(timestamp > block.timestamp, "Temps depasse"); // En commentaire pour les tests
        Authorization storage authorization = map_authorization[idOrder];
        require(authorization.idOrder != idOrder, "Commande existe deja");

        list_idOrder.push(idOrder);
        authorization.idOrder = idOrder;
        authorization.idDeliverer = idDeliverer;
        authorization.timestamp = timestamp;
        //map_authorization[idOrder] = Authorization(idOrder, idDeliverer, timestamp);
    }

    /**
     * @notice Supprime une autorisation depuis l'id de la commande
     * @param idOrder L'id de la commande
     * @param idDeliverer Le nouvel id du livreur
     */
    function changeDelivererAuthorization(uint64 idOrder, uint64 idDeliverer) onlyOwner external {
        Authorization storage authorization = map_authorization[idOrder];
        require(authorization.idOrder == idOrder, "Commande non trouvee");
        require(authorization.idDeliverer != idDeliverer, "Livreur deja assigne");

        authorization.idDeliverer = idDeliverer;
    }

    /**
     * @notice Supprime l'autorisation depuis l'id de la commande
     * @param idOrder L'id à supprimer
     */
    function deleteAuthorization(uint64 idOrder) onlyOwner external {
        uint64 length = uint64(list_idOrder.length);
        uint64[] memory _list_idOrder = list_idOrder;
        bool deleted;
        for (uint64 i; i < length; ++i) {
            if (_list_idOrder[i] == idOrder) {
                delete map_authorization[idOrder];
                list_idOrder[i] = list_idOrder[length - 1];
                list_idOrder.pop();
                deleted = true;
                break;
            }
        }
        emit DeleteAuthorization(deleted);
    }

    /**
     * @notice Supprime une autorisation depuis l'id de la commande
     * @param idOrder La list des id de commande à supprimer
     */
    function deleteAuthorization(uint64[] calldata idOrder) onlyOwner external {
        require(list_idOrder.length > 0, "Liste d'autorisation vide");
        require(idOrder.length > 0, "Liste en parametre vide");
        uint64 length = uint64(list_idOrder.length);
        uint64 length2 = uint64(idOrder.length);
        bool deleted; // par défaut à "false"

        for (uint64 i = length; i >= 1; --i) {
            for (uint64 j; j < length2; ++j) {
                if (list_idOrder[i - 1] == idOrder[j]) {
                    delete map_authorization[list_idOrder[i - 1]];
                    list_idOrder[i - 1] = list_idOrder[length - 1];
                    list_idOrder.pop();
                    deleted = true;
                    break;
                }
            }
        }
        emit DeleteAuthorization(deleted);
    }

    /**
     * @notice Envoi une requête "POST" à l'aide du service "Chainlink" avec l'id de la commande et à qui transmetre les données
     * @param idOrder L'id de la commande
     * @param idDeliverer L'id du livreur
     * @param url L'url voulu
     * @param _oracle L'oracle ou l'opérateur devant être utilisé
     * @param _jobId Le(s) job id qui seront appelé(s)
     * @return requestId La requête à envoyer ou le texte d'erreur en json
     */
    function sendData(uint64 idOrder, uint64 idDeliverer, string calldata url, address _oracle, string calldata _jobId) onlyOwner external returns (bytes32 requestId) {
        Authorization memory authorization = map_authorization[idOrder];
        require(authorization.idOrder == idOrder && authorization.idDeliverer == idDeliverer, "Autorisation inexistante");
        require(authorization.timestamp > block.timestamp, "Autorisation plus valable");

        Chainlink.Request memory req = buildOperatorRequest(
            stringToBytes32(_jobId),
            this.fulfill.selector
        );
        req.add('post',
            string.concat(
                url,
                Strings.toString(uint256(authorization.idOrder)),
                "/",
                Strings.toString(uint256(authorization.idDeliverer))
            )
        );
        return sendOperatorRequestTo(_oracle, req, ORACLE_PAYMENT);
    }

    /**
     * @notice Montre l'autorisation d'une commande
     * @param idOrder L'id de la commande
     * @return authorization L'autorisation
     */
    function getAuthorization(uint64 idOrder) onlyOwner external view returns (Authorization memory authorization) {
        return map_authorization[idOrder];
    }

    /**
     * @notice Montre toutes les autorisations de commandes
     * @return authorization La d'autorisation
     */
    function getAllAuthorization(uint64 from, uint64 to) onlyOwner public view returns(Authorization[] memory) {
        require(from < to, "debut > fin");
        require(from < list_idOrder.length, "Index depasse");
        uint64[] memory _list_idOrder = list_idOrder;
        if (to > uint64(_list_idOrder.length)) {
            to = uint64(_list_idOrder.length);
        }
        Authorization[] memory authorizations = new Authorization[](to - from);
        for (uint64 i = to; i > from;) { unchecked { --i; }
            authorizations[i] = map_authorization[_list_idOrder[i]];
        }
        return authorizations;
    }

    /**
     * @notice Reçoit la réponse sous forme de text (json)
     * @param _requestId La requête
     * @param result La réponse à la requêtes
     */
    function fulfill(bytes32 _requestId, string calldata result) public recordChainlinkFulfillment(_requestId) {
        emit RequestFirstId(_requestId, result);
    }

    /**
     * @notice Permet le retrait de jeton "Link" du contrat
     */
    function withdrawLink() onlyOwner external {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
    }

    /**
     * @notice Transforme une variable du format "string" en "bytes32"
     * @param source La variable à transformer
     * @return result La variable transformée
     */
    function stringToBytes32(string memory source) private pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }
        assembly { result := mload(add(source, 32)) }
    }
}
