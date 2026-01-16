# GarbageInGoldOut Video Engine

A semantic video distillery that transforms rambling videos into tight, polished content.

## Setup

```bash
cd gigo
pip install -r requirements.txt
```

## Environment

Create `.env` file:
```
OPENAI_API_KEY=your_key_here
```

## Usage

```python
from gigo import process_video

result = process_video("path/to/rambling_video.mp4")
print(result.edl)  # Edit Decision List
```
