pragma solidity 0.8.17;

contract Nostr3 {
	mapping(bytes32 => uint) public encryptedDeposits;

	address public owner;

	uint256 public fees;

	uint256 public FEE = 10; // 10 / 10000 =  

	struct Nostr3Account {
		bytes publicKey;
		address evmAddres;
	}

	Nostr3Account[] public accounts;

	constructor() {
		owner = msg.sender;
	}


	function join(bytes memory publicKey,address evmAddress) public {
		Nostr3Account memory account;
		account.publicKey = publicKey;
		account.evmAddres = evmAddress;
		accounts.push(account);
	}

	function change(bytes memory publicKey, address newEvmAddress) public {
		bool isFound = false;
		for (uint i = 0; i < accounts.length; i++) {
			if (keccak256(accounts[i].publicKey) == keccak256(publicKey)) {
				require(msg.sender == accounts[i].evmAddres, "NOT_ALLOWED");
				accounts[i].evmAddres = newEvmAddress;
				isFound = true;
				break;
			}
		}
    	require(isFound, "PUBLIC_KEY_NOT_FOUND");
	}


	function changeOwner(address _newOwner) public {
		require(msg.sender == owner, "NOT_ALLOWED");
		owner = _newOwner;
	}

	function deposit(bytes32 encryptedHash) public payable {
		uint256 feeAmount = msg.value * FEE / 10000;
		uint256 depositAmount = msg.value - feeAmount;
		fees += feeAmount;
		encryptedDeposits[encryptedHash] = depositAmount;
	}

	function withdraw(string calldata key) public {
		bytes32 hashed = keccak256(abi.encode(key));
		uint amount = encryptedDeposits[hashed];
		payable(msg.sender).transfer(amount);
		encryptedDeposits[hashed] = 0;
	}

	function withdrawFees() public {
		require(msg.sender == owner, "NOT_ALLOWED");
		uint256 amountToSend = fees;
		fees = 0;
		payable(msg.sender).transfer(amountToSend);
	}

	function getAccounts() public view returns (bytes[] memory, address[] memory) {
        bytes[] memory publicKeys = new bytes[](accounts.length);
        address[] memory evmAddresses = new address[](accounts.length);

        for (uint i = 0; i < accounts.length; i++) {
            publicKeys[i] = accounts[i].publicKey;
            evmAddresses[i] = accounts[i].evmAddres;
        }

        return (publicKeys, evmAddresses);
    }

}
