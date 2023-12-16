pragma solidity 0.8.17;
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Nostr3 is Ownable, ReentrancyGuard {
	mapping(bytes32 => uint) public encryptedDeposits;

	uint256 public fees;

	uint256 public FEE = 10; // 10 / 10000 =

	mapping(bytes => uint256) private publicKeyToIndex;

	struct Nostr3Account {
		bytes publicKey;
		address evmAddres;
	}

	Nostr3Account[] public accounts;

	function join(bytes memory publicKey, address evmAddress) public {
		require(publicKey.length > 0, "Invalid public key");
		require(evmAddress != address(0), "Invalid EVM address");
		require(publicKeyToIndex[publicKey] == 0, "Public key already exists");

		Nostr3Account memory account;
		account.publicKey = publicKey;
		account.evmAddres = evmAddress;
		accounts.push(account);
		publicKeyToIndex[publicKey] = accounts.length; // Store the index of the account
	}

	function change(bytes memory publicKey, address newEvmAddress) public {
		uint256 index = publicKeyToIndex[publicKey];
		require(index != 0, "PUBLIC_KEY_NOT_FOUND");
		index--; // Adjust for zero-based indexing

		require(msg.sender == accounts[index].evmAddres, "NOT_ALLOWED");
		accounts[index].evmAddres = newEvmAddress;
	}

	function changeOwner(address _newOwner) public onlyOwner {
		transferOwnership(_newOwner);
	}

	// TODO : Add reentrancy
	function deposit(bytes32 encryptedHash) public payable nonReentrant {
		uint256 feeAmount = (msg.value * FEE) / 10000;
		uint256 depositAmount = msg.value - feeAmount;
		fees += feeAmount;
		encryptedDeposits[encryptedHash] = depositAmount;
	}

	function withdraw(string calldata key) public nonReentrant {
		bytes32 hashed = keccak256(abi.encode(key));
		uint amount = encryptedDeposits[hashed];
		encryptedDeposits[hashed] = 0;
		payable(msg.sender).transfer(amount);
	}

	function withdrawFees() public onlyOwner {
		uint256 amountToSend = fees;
		fees = 0;
		payable(msg.sender).transfer(amountToSend);
	}

	function getAccounts()
		public
		view
		returns (bytes[] memory, address[] memory)
	{
		bytes[] memory publicKeys = new bytes[](accounts.length);
		address[] memory evmAddresses = new address[](accounts.length);

		for (uint i = 0; i < accounts.length; i++) {
			publicKeys[i] = accounts[i].publicKey;
			evmAddresses[i] = accounts[i].evmAddres;
		}

		return (publicKeys, evmAddresses);
	}
}
