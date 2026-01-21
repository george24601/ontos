#!/usr/bin/env python3
"""scripts/generate_release_notes.py"""
import subprocess
import re
from datetime import datetime

CATEGORIES = {
    "feat": "✨ Features",
    "fix": "🐛 Bug Fixes", 
    "docs": "📚 Documentation",
    "perf": "⚡ Performance",
    "refactor": "♻️ Refactoring",
    "test": "🧪 Testing",
    "chore": "🔧 Maintenance",
}

def generate_notes(since_tag: str = None):
    cmd = ["git", "log", "--oneline", "--no-merges"]
    if since_tag:
        cmd.append(f"{since_tag}..HEAD")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    commits = result.stdout.strip().split("\n")
    
    categorized = {cat: [] for cat in CATEGORIES.values()}
    categorized["Other"] = []
    
    for commit in commits:
        if not commit:
            continue
        match = re.match(r"^[a-f0-9]+ (\w+)(\(.+\))?: (.+)$", commit)
        if match:
            type_, scope, message = match.groups()
            category = CATEGORIES.get(type_, "Other")
            categorized[category].append(f"- {message}")
        else:
            categorized["Other"].append(f"- {commit.split(' ', 1)[1]}")
    
    notes = [f"# Release Notes - {datetime.now().strftime('%Y-%m-%d')}\n"]
    for category, items in categorized.items():
        if items:
            notes.append(f"\n## {category}\n")
            notes.extend(items)
    
    return "\n".join(notes)

if __name__ == "__main__":
    import sys
    since = sys.argv[1] if len(sys.argv) > 1 else None
    print(generate_notes(since))