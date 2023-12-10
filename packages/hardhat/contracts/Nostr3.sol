pragma solidity 0.8.17;

contract Nostr3 {
	mapping(bytes32 => uint) public encryptedDeposits;
	address public owner;
	uint256 public fees;
	uint256 public FEE_PERCENTAGE;

	constructor() {
		owner = msg.sender;
	}

	function changeOwner(address _newOwner) public {
		require(msg.sender == owner, "NOT_ALLOWED");
		owner = _newOwner;
	}

	function deposit(bytes32 encryptedHash) public payable {
		uint256 feeAmount = (msg.value * FEE_PERCENTAGE) / 10000;
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
}
