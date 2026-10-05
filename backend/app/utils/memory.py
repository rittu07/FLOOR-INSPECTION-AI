"""
Memory helpers for small hosts (e.g. Render free: 512 MB). After large image/ML requests, glibc keeps freed
heap pages, so the process RSS ratchets up until the host kills it; returning them to the OS keeps it bounded.
"""

import ctypes
import gc
import sys
from typing import Optional

_libc = None
if sys.platform.startswith("linux"):
    try:
        _libc = ctypes.CDLL("libc.so.6")
    except OSError:
        _libc = None


def release_memory() -> None:
    """Collect garbage and hand freed heap memory back to the OS (Linux/glibc)."""
    gc.collect()
    if _libc is not None:
        try:
            _libc.malloc_trim(0)
        except Exception:
            pass


def current_rss_mb() -> Optional[float]:
    """Resident memory of this process in MB (Linux only; None elsewhere)."""
    try:
        with open("/proc/self/status", encoding="utf-8") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    return round(int(line.split()[1]) / 1024, 1)
    except OSError:
        return None
    return None


async def run_heavy(fn, *args, **kwargs):
    """
    Runs CPU-heavy CV/ML work in a worker thread (keeps the event loop and /health responsive) and
    releases memory afterwards.
    """
    from starlette.concurrency import run_in_threadpool

    try:
        return await run_in_threadpool(fn, *args, **kwargs)
    finally:
        release_memory()
