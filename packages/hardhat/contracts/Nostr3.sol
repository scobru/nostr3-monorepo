pragma solidity 0.8.17;

contract Nostr3 {
	mapping(bytes32 => uint) public encryptedDeposits;

	address public owner;

	uint256 public fees;

	uint256 public FEE = 1 wei;
	
	uint256 constant MAX_FEE = 1000 wei;

	constructor() {
		owner = msg.sender;
	}

	function changeFEE(uint256 newFee) public {
		require(msg.sender == owner, "NOT_ALLOWED");
		require(newFee <= MAX_FEE, "FEE_TO_HIGH");
		FEE = newFee;
	}

	function changeOwner(address _newOwner) public {
		require(msg.sender == owner, "NOT_ALLOWED");
		owner = _newOwner;
	}

	function deposit(bytes32 encryptedHash) public payable {
		uint256 depositAmount = msg.value - FEE;
		fees += FEE;

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
