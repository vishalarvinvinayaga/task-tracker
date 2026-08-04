import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app_instance import mcp  # noqa: E402
from tools import inbox_tools, kb_tools, note_tools, planning_tools, send_tools, task_tools, time_tools  # noqa: E402,F401

if __name__ == "__main__":
    mcp.run(transport="stdio")
