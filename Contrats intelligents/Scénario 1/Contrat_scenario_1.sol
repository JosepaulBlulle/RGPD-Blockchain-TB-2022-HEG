// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title Contrat Scenario 1
 * @notice Envoyer des newsletters hebdomadaires aux clients qui l'ont consentis et inscrits sur notre site web
 * @author Blülle Celado
 */
contract ContratScenario1 is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    // Chainlink variables
    // 0, car nous sommes aussi l'opérateur
    uint256 private constant ORACLE_PAYMENT = (0 * LINK_DIVISIBILITY) / 10; // 0,1 * 10**18 (Varies by network and job);

    // Others variables
    struct Consent {
        uint64 id;
        bool email;
        bool username;
        bool gender;
        uint64 timestamp;
    }
    uint64 private immutable FIRST_BLOCK_NUMBER;
    uint64 private index_end;
    uint64[] private list_id;
    mapping (uint64 => Consent) private map_consent;
    string private constant FINALITY = "Envoyer des newsletters hebdomadaires aux clients qui l'ont consentis et inscrits sur notre site web";

    // Events
    event RequestFirstId(bytes32 indexed requestId, string result);
    event DeleteConsent(bool deleted);

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
     * @notice Fonction qui crée un nombre conséquent de consentements pour des tests
     * @param nb Nombre de consentements à rajouter (modifier ceux qui existe déjà aussi)
     */
    function testAddConsent(uint64 nb) onlyOwner external {
        for (uint64 i = 1; i < nb; ++i) {
            list_id.push(i);
            map_consent[i] = Consent(i, true, true, true, 0);
        }
        if (index_end < nb) {
            index_end = nb;
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
     * @notice Donne le numéro du premier bloc lors du déploiement
     * @return Le numéro du bloc
     */
    function getFirstBlockNumber() external view returns(uint64) {
        return FIRST_BLOCK_NUMBER;
    }

    /**
     * @notice Donne la taille de la liste des consentements
     * @return La taille
     */
    function getSize() onlyOwner external view returns(uint64) {
        return index_end;
    }

    /**
     * @notice Supprime toutes les données du contrat intelligent
     */
    function deleteAll() onlyOwner external {
        index_end = 0;
    }

    /**
     * @notice Donne les consentements d'un id
     * @param id L'id voulu
     * @return consent Un objet contenant un id, les consentements de : email, username, gender et un timestamp
     */
    function getConsent(uint64 id) onlyOwner external view returns(Consent memory consent) {
        consent = map_consent[id];
        // retourne email "false" si le temps est dépassé, va le modifier lorsque l'utilisateur modifie son consentement ou lorsque l'envoie des emails est effectué
        if (consent.timestamp != 0 && consent.timestamp < block.timestamp) {
            consent.email = false;
            consent.timestamp = 0;
        }
        return consent;
    }

    /**
     * @notice Modifie ou ajoute les consentements d'un id
     * @param id L'id voulu
     * @param email Consentement de l'envoi d'emails
     * @param username Consentement de la personalisation de l'envoi avec le nom d'utilisateur
     * @param gender Consentement de la personalisation de l'envoi avec le genre
     * @param timestamp Date à laquelle le consentement de l'email changera à "false"
     */
    function setConsent(uint64 id, bool email, bool username, bool gender, uint64 timestamp) onlyOwner external {
        // require(timestamp > block.timestamp || timestamp == 0, "Temps depasse"); // En commentaire pour les tests

        Consent memory consent = map_consent[id];
        if (consent.id == 0) { // Création moins optimisée d'envrion 33% pour optimiser la suppression de x10
            if (index_end < list_id.length) {
                list_id[index_end] = id;

            } else {
                list_id.push(id);
            }
            ++index_end;
            consent.id = id;
            consent.email = email;
            consent.gender = gender;
            consent.username = username;
            consent.timestamp = timestamp;
            map_consent[id] = consent;

        } else { // Optimise environ 10% la modification 0.00007544 à 0.00006849 (exemple)
            if (consent.email != email) map_consent[id].email = email;
            if (consent.gender != gender) map_consent[id].gender = gender;
            if (consent.username != username) map_consent[id].username = username;
            if (consent.timestamp != timestamp) map_consent[id].timestamp = timestamp;
        }
    }

    /**
     * @notice Supprime les consentements d'un id
     * @param id L'id à supprimer
     */
    function deleteConsent(uint64 id) onlyOwner external {
        require(list_id.length > 0, "Aucune autorisation a supprimer");
        uint64 _index_end = index_end;
        bool deleted;

        for (uint64 i; i < _index_end; ++i) {
            if (list_id[i] == id) {
                delete map_consent[id];
                list_id[i] = list_id[_index_end - 1];
                --index_end;
                deleted = true;
                break;
            }
        }
        emit DeleteConsent(deleted);
    }

    /**
     * @notice Supprime les consentements depuis une liste d'id
     * @param id La liste des id à supprimer
     */
    function deleteConsent(uint64[] calldata id) onlyOwner external {
        require(index_end > 0, "Aucun consentement a supprimer");
        require(id.length > 0, "Liste du parametre vide");
        uint64[] memory _list_id = list_id;
        uint64 _index_end = index_end;
        uint64 length = uint64(id.length);
        uint64 numberDeleted; // par défaut à 0

        for (uint64 i = _index_end; i > 0;) { unchecked { --i; }
            for (uint64 j = length; j > 0;) { unchecked { --j; }
                if (_list_id[i] == id[j]) {
                    // Supression sur la map
                    delete map_consent[_list_id[i]];
                    // Si ce n'est pas le dernier élément on l'inverse
                    if (i < _index_end - numberDeleted - 1) {
                        list_id[i] = _list_id[i] = _list_id[_index_end - numberDeleted - 1];
                    }
                    // Maximum égal à _index_end - 1
                    unchecked { ++numberDeleted; }
                    break;
                }
            }
        }

        if (numberDeleted > 0) {
            unchecked { index_end = _index_end - numberDeleted; }
            emit DeleteConsent(true);

        } else {
            emit DeleteConsent(false);
        }
    }

    /**
     * @notice Donne tous les consentements
     * @return Une liste d'objets contenant chacun un id, email, username, gender et timestamp
     */
    function getAllConsent(uint64 from, uint64 to) onlyOwner public view returns(Consent[] memory) {
        require(from < to, "debut > fin");
        require(from < index_end, "Index depasse");
        uint64[] memory _list_id = list_id;
        if (to > index_end) {
            to = index_end;
        }
        Consent[] memory consents = new Consent[](to - from);
        for (uint64 i = to; i > from;) { unchecked { --i; }
            consents[i] = map_consent[_list_id[i]];
        }
        return consents;
    }

    /**
     * @notice Donne tous les consentements qui ont l'élément "email" à "true" et "timestamp" à "0" ou plus grand à la date actuelle
     * @return Une liste d'objets contenant chacun un id, email, username, gender et timestamp
     */
    function getAllTrueConsent() onlyOwner public view returns(Consent[] memory) {
        uint64[] memory _list_id = list_id;
        uint64 _index_end = index_end;
        Consent[] memory consents = new Consent[](_index_end);
        Consent memory consent;

        for (uint64 i = _index_end; i > 0;) { unchecked { --i; }
            consent = map_consent[_list_id[i]];
            if (consent.email && (consent.timestamp == 0 || consent.timestamp > block.timestamp)) {
                consents[i] = consent;
            }
        }
        return consents;
    }

    /**
     * @notice Envoi une requête "POST" à l'aide du service "Chainlink" avec les consentements en paramètre sur l'url
     * @param url L'url voulu
     * @param _oracle L'oracle ou l'opérateur devant être utilisé
     * @param _jobId Le ou les job id qui seront appelé(s)
     * @return requestId La requête à envoyer
     */
    function sendEmail(string calldata url, address _oracle, string calldata _jobId) onlyOwner external returns(bytes32 requestId) {
        Chainlink.Request memory req = buildOperatorRequest(
            stringToBytes32(_jobId),
            this.fulfill.selector
        );

        Consent[] memory consents = getAllTrueConsent();
        uint64 _index_end = index_end;
        string memory temp = "{";
        uint64 i;

        while (i < _index_end) {
            if (consents[i].timestamp == 0 || consents[i].timestamp > block.timestamp) {
                temp = string.concat(
                    temp,
                    '"', Strings.toString(uint256(consents[i].id)), '":',
                    consents[i].username?"1":"",
                    consents[i].gender?"1":"0"
                );
                break;

            } else {
                map_consent[consents[i].id].email = false;
                map_consent[consents[i].id].timestamp = 0;
            }
            unchecked { ++i; }
        }
        ++i;
        while (i < _index_end) {
            if (consents[i].timestamp == 0 || consents[i].timestamp > block.timestamp) {
                temp = string.concat(
                    temp,
                    ",",
                    '"', Strings.toString(uint256(consents[i].id)), '":',
                    consents[i].username?"1":"",
                    consents[i].gender?"1":"0"
                );

            } else {
                map_consent[consents[i].id].email = false;
                map_consent[consents[i].id].timestamp = 0;
            }
            unchecked { ++i; }
        }
        // http://ipaddress:xxxx/xxxx/{"1":11,"2":0}
        req.add('post', string.concat(url, string.concat(temp, '}')));
        return sendOperatorRequestTo(_oracle, req, ORACLE_PAYMENT);
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
