#!/usr/bin/env python3
"""Fetch YouTube transcript. Usage: python3 youtube-transcript.py VIDEO_ID [LANG]"""
import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

video_id = sys.argv[1]
lang = sys.argv[2] if len(sys.argv) > 2 else None

api = YouTubeTranscriptApi()
try:
    if lang:
        transcript = api.fetch(video_id, languages=[lang])
    else:
        transcript = api.fetch(video_id)

    result = []
    for snippet in transcript.snippets:
        mins = int(snippet.start // 60)
        secs = int(snippet.start % 60)
        result.append({
            "ts": f"{mins}:{secs:02d}",
            "text": snippet.text,
            "start": snippet.start,
        })

    print(json.dumps({"success": True, "transcript": result, "lang": transcript.language}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
