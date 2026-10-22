"""
Chương 1 - Mô hình hóa Kripke Structure
Kế thừa nguyên bản thuật toán và cấu trúc hình thức từ giáo trình CSE703093.

Kripke Structure K = (S, S0, R, L)
  S  : tập hữu hạn các trạng thái (states)
  S0 : tập trạng thái khởi tạo (initial states) subset S
  R  : quan hệ chuyển trạng thái (transition relation) R subset S x S (total)
  L  : hàm gán nhãn (labeling function) L: S -> 2^AP
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Iterable, Set, FrozenSet, List, Optional
from collections import deque


class KripkeStructureError(ValueError):
    """Lỗi vi phạm tính total của R hoặc tham chiếu trạng thái không tồn tại."""


@dataclass
class KripkeStructure:
    states: Set[str] = field(default_factory=set)
    initial_states: Set[str] = field(default_factory=set)
    transitions: Dict[str, Set[str]] = field(default_factory=dict)
    labeling: Dict[str, FrozenSet[str]] = field(default_factory=dict)

    def add_state(self, s: str, labels: Iterable[str] = ()) -> None:
        self.states.add(s)
        self.labeling.setdefault(s, frozenset())
        self.labeling[s] = frozenset(labels) | self.labeling[s]
        self.transitions.setdefault(s, set())

    def set_initial(self, *states: str) -> None:
        for s in states:
            if s not in self.states:
                raise KripkeStructureError(f"Trạng thái khởi tạo '{s}' chưa được khai báo")
            self.initial_states.add(s)

    def add_transition(self, src: str, dst: str) -> None:
        if src not in self.states or dst not in self.states:
            raise KripkeStructureError(f"Chuyển tiếp ({src} -> {dst}) tham chiếu trạng thái không tồn tại")
        self.transitions.setdefault(src, set()).add(dst)

    def validate_total(self) -> None:
        """Kiểm tra quan hệ R là total: mỗi trạng thái phải có ít nhất 1 chuyển tiếp đi ra."""
        for s in self.states:
            if not self.transitions.get(s):
                raise KripkeStructureError(
                    f"Trạng thái '{s}' không có chuyển tiếp đi ra (vi phạm tính total của R). "
                    f"Thêm self-loop nếu đây là trạng thái kết thúc hợp lệ."
                )

    def labels_of(self, s: str) -> FrozenSet[str]:
        return self.labeling.get(s, frozenset())

    def reachable_from(self, start_states: Optional[Iterable[str]] = None) -> Set[str]:
        """BFS: tập trạng thái có thể tới được từ tập trạng thái khởi đầu."""
        frontier = deque(start_states if start_states is not None else self.initial_states)
        visited: Set[str] = set(frontier)
        while frontier:
            s = frontier.popleft()
            for t in self.transitions.get(s, ()):
                if t not in visited:
                    visited.add(t)
                    frontier.append(t)
        return visited

    def check_invariant(self, unsafe_label: str) -> Dict[str, object]:
        """
        Kiểm tra thuộc tính AG(not unsafe_label):
        'Trên mọi đường thi hành, từ mọi trạng thái khởi tạo, không bao giờ đạt tới trạng thái mang nhãn unsafe_label'.
        Trả về: {"holds": bool, "counterexample_path": List[str] | None}
        """
        parent: Dict[str, Optional[str]] = {s: None for s in self.initial_states}
        frontier = deque(self.initial_states)
        visited: Set[str] = set(self.initial_states)

        for s in self.initial_states:
            if unsafe_label in self.labels_of(s):
                return {"holds": False, "counterexample_path": [s]}

        while frontier:
            s = frontier.popleft()
            for t in self.transitions.get(s, ()):
                if t in visited:
                    continue
                visited.add(t)
                parent[t] = s
                if unsafe_label in self.labels_of(t):
                    return {"holds": False, "counterexample_path": self._rebuild_path(parent, t)}
                frontier.append(t)

        return {"holds": True, "counterexample_path": None}

    @staticmethod
    def _rebuild_path(parent: Dict[str, Optional[str]], target: str) -> List[str]:
        path = [target]
        while parent[path[-1]] is not None:
            path.append(parent[path[-1]])
        path.reverse()
        return path

    def check_reachability(self, goal_label: str) -> Dict[str, object]:
        """Kiểm tra thuộc tính EF(goal_label): tồn tại ít nhất 1 đường thi hành tới trạng thái goal."""
        reachable = self.reachable_from()
        witnesses = [s for s in reachable if goal_label in self.labels_of(s)]
        return {"holds": len(witnesses) > 0, "witness_states": witnesses}

    def to_dot(self) -> str:
        """Xuất sang định dạng Graphviz DOT để trực quan hóa đồ thị."""
        lines = ["digraph Kripke {", "  rankdir=LR;", "  node [shape=ellipse];"]
        for s in sorted(self.states):
            lbl = ", ".join(sorted(self.labels_of(s))) or "-"
            shape = "doublecircle" if s in self.initial_states else "ellipse"
            lines.append(f'  "{s}" [label="{s}\\n{{{lbl}}}", shape={shape}];')
        for src in sorted(self.transitions.keys()):
            for dst in sorted(self.transitions[src]):
                lines.append(f'  "{src}" -> "{dst}";')
        lines.append("}")
        return "\n".join(lines)
