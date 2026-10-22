"""Build the probe transactions and the lane funding / refund transfers."""
import struct

from solders.hash import Hash
from solders.instruction import Instruction
from solders.keypair import Keypair
from solders.message import Message
from solders.pubkey import Pubkey
from solders.system_program import TransferParams, transfer
from solders.transaction import Transaction

COMPUTE_BUDGET = Pubkey.from_string("ComputeBudget111111111111111111111111111111")
MEMO = Pubkey.from_string("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
RENT_EXEMPT_EMPTY = 890_880  # lamports for a 0-byte system account


def set_cu_limit(units: int) -> Instruction:
    return Instruction(COMPUTE_BUDGET, bytes([2]) + struct.pack("<I", units), [])


def set_cu_price(micro_lamports: int) -> Instruction:
    return Instruction(COMPUTE_BUDGET, bytes([3]) + struct.pack("<Q", micro_lamports), [])


def memo(text: str) -> Instruction:
    return Instruction(MEMO, text.encode(), [])


def probe_tx(payer: Keypair, blockhash: Hash, cu_limit: int, cu_price: int, tag: str) -> Transaction:
    """One probe: its only writable account is its own payer, so probes never contend for locks."""
    ixs = [set_cu_limit(cu_limit), set_cu_price(cu_price), memo(tag)]
    msg = Message.new_with_blockhash(ixs, payer.pubkey(), blockhash)
    return Transaction([payer], msg, blockhash)


def transfer_tx(src: Keypair, dst: Pubkey, lamports: int, blockhash: Hash) -> Transaction:
    ix = transfer(TransferParams(from_pubkey=src.pubkey(), to_pubkey=dst, lamports=lamports))
    msg = Message.new_with_blockhash([ix], src.pubkey(), blockhash)
    return Transaction([src], msg, blockhash)
