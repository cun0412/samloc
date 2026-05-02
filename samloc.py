from __future__ import annotations

import random
from collections import Counter
from dataclasses import dataclass
from typing import List, Tuple

RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"]
SUITS = ["♠", "♣", "♦", "♥"]
RANK_VALUE = {r: i for i, r in enumerate(RANKS)}


@dataclass(frozen=True)
class Card:
    rank: str
    suit: str

    @property
    def value(self) -> int:
        return RANK_VALUE[self.rank]

    def __str__(self) -> str:
        return f"{self.rank}{self.suit}"


class HandType:
    SINGLE = "single"
    PAIR = "pair"
    TRIPLE = "triple"
    STRAIGHT = "straight"
    FOUR_KIND = "four_kind"


@dataclass
class Move:
    cards: List[Card]
    kind: str
    strength: Tuple[int, int]


def build_deck() -> List[Card]:
    return [Card(rank, suit) for rank in RANKS for suit in SUITS]


def sort_cards(cards: List[Card]) -> List[Card]:
    return sorted(cards, key=lambda c: (c.value, SUITS.index(c.suit)))


def is_straight(cards: List[Card]) -> bool:
    if len(cards) < 3:
        return False
    values = sorted(c.value for c in cards)
    if values[-1] == RANK_VALUE["2"]:
        return False
    return all(values[i] + 1 == values[i + 1] for i in range(len(values) - 1))


def classify(cards: List[Card]) -> Move | None:
    cards = sort_cards(cards)
    cnt = Counter(c.rank for c in cards)
    n = len(cards)

    if n == 1:
        return Move(cards, HandType.SINGLE, (1, cards[-1].value))
    if n == 2 and len(cnt) == 1:
        return Move(cards, HandType.PAIR, (2, cards[-1].value))
    if n == 3 and len(cnt) == 1:
        return Move(cards, HandType.TRIPLE, (3, cards[-1].value))
    if n == 4 and len(cnt) == 1:
        return Move(cards, HandType.FOUR_KIND, (4, cards[-1].value))
    if is_straight(cards):
        return Move(cards, HandType.STRAIGHT, (n, cards[-1].value))
    return None


def can_beat(move: Move, prev: Move | None) -> bool:
    if prev is None:
        return True

    # Tứ quý chặt 2
    if move.kind == HandType.FOUR_KIND and prev.kind == HandType.SINGLE and prev.cards[0].rank == "2":
        return True

    if move.kind != prev.kind:
        return False

    if move.kind == HandType.STRAIGHT and len(move.cards) != len(prev.cards):
        return False

    return move.strength[1] > prev.strength[1]


def parse_indices(raw: str, hand_len: int) -> List[int] | None:
    try:
        idx = [int(x) for x in raw.strip().split()]
    except ValueError:
        return None
    if not idx:
        return None
    if any(i < 0 or i >= hand_len for i in idx):
        return None
    if len(set(idx)) != len(idx):
        return None
    return sorted(idx)


def choose_ai_move(hand: List[Card], prev: Move | None) -> Move | None:
    hand = sort_cards(hand)
    # thử từng tổ hợp nhỏ trước để AI đơn giản
    combos: List[List[int]] = []
    n = len(hand)
    for i in range(n):
        combos.append([i])
    for i in range(n - 1):
        for j in range(i + 1, n):
            combos.append([i, j])
    for i in range(n - 2):
        for j in range(i + 1, n - 1):
            for k in range(j + 1, n):
                combos.append([i, j, k])
    for i in range(n - 3):
        for j in range(i + 1, n - 2):
            for k in range(j + 1, n - 1):
                for l in range(k + 1, n):
                    combos.append([i, j, k, l])
    for length in range(5, min(10, n) + 1):
        def rec(start: int, pick: List[int]):
            if len(pick) == length:
                combos.append(pick.copy())
                return
            for t in range(start, n):
                pick.append(t)
                rec(t + 1, pick)
                pick.pop()
        rec(0, [])

    valid: List[Move] = []
    for c in combos:
        mv = classify([hand[i] for i in c])
        if mv and can_beat(mv, prev):
            valid.append(mv)

    if not valid:
        return None

    # chọn nước nhỏ nhất hợp lệ
    valid.sort(key=lambda m: (len(m.cards), m.strength[1]))
    return valid[0]


def remove_cards(hand: List[Card], cards: List[Card]) -> None:
    for c in cards:
        hand.remove(c)


def show_hand(hand: List[Card]) -> None:
    hand[:] = sort_cards(hand)
    print("Bài của bạn:")
    for i, c in enumerate(hand):
        print(f"  [{i}] {c}")


def main() -> None:
    print("=== SÂM LỐC (CLI đơn giản) ===")
    players = ["Bạn", "Máy 1", "Máy 2", "Máy 3"]
    deck = build_deck()
    random.shuffle(deck)
    hands = {p: sort_cards([deck.pop() for _ in range(10)]) for p in players}

    # ván đầu: ai có 3 bích (lá nhỏ nhất) đi trước
    first = 0
    min_card = Card("2", "♥")
    for i, p in enumerate(players):
        c = min(hands[p], key=lambda x: (x.value, SUITS.index(x.suit)))
        if (c.value, SUITS.index(c.suit)) < (min_card.value, SUITS.index(min_card.suit)):
            min_card = c
            first = i

    turn = first
    prev_move: Move | None = None
    pass_count = 0

    while True:
        p = players[turn]
        print(f"\nLượt: {p}")
        hand = hands[p]

        if p == "Bạn":
            show_hand(hand)
            if prev_move:
                print("Bài cần chặn:", " ".join(str(c) for c in prev_move.cards), f"({prev_move.kind})")
            else:
                print("Bạn được đánh mở.")

            raw = input("Nhập index các lá (cách nhau bởi khoảng trắng), hoặc 'p' để bỏ lượt: ").strip().lower()
            if raw == "p":
                if prev_move is None:
                    print("Không thể bỏ lượt khi đang mở bài.")
                    continue
                print("Bạn bỏ lượt.")
                pass_count += 1
            else:
                idx = parse_indices(raw, len(hand))
                if idx is None:
                    print("Index không hợp lệ.")
                    continue
                cards = [hand[i] for i in idx]
                mv = classify(cards)
                if mv is None:
                    print("Bộ bài không hợp lệ theo luật Sâm.")
                    continue
                if prev_move and len(hand) == len(cards) and cards[0].rank == "2":
                    print("Không được về nhất bằng quân 2 (thối 2).")
                    continue
                if not can_beat(mv, prev_move):
                    print("Không chặn được bài trước.")
                    continue
                remove_cards(hand, cards)
                prev_move = mv
                pass_count = 0
                print("Bạn đánh:", " ".join(str(c) for c in cards))
        else:
            mv = choose_ai_move(hand, prev_move)
            if mv is None:
                print(f"{p} bỏ lượt.")
                pass_count += 1
            else:
                if prev_move and len(hand) == len(mv.cards) and mv.cards[0].rank == "2":
                    print(f"{p} bỏ lượt (tránh thối 2).")
                    pass_count += 1
                else:
                    remove_cards(hand, mv.cards)
                    prev_move = mv
                    pass_count = 0
                    print(f"{p} đánh:", " ".join(str(c) for c in mv.cards), f"({mv.kind})")

        if len(hand) == 0:
            print(f"\n🎉 {p} đã hết bài và thắng!")
            break

        # nếu 3 người bỏ lượt liên tục thì reset vòng
        if pass_count >= 3:
            print("--- Vòng mới (reset bài chặn) ---")
            prev_move = None
            pass_count = 0

        turn = (turn + 1) % 4


if __name__ == "__main__":
    main()
