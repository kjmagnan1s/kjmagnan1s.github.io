---
layout: page
title: Career Timeline
permalink: /timeline/
---

# Career Timeline

<script id="__career-data" type="application/json">
  {{ site.data.career | jsonify }}
</script>

<div id="timeline"></div>

<link rel="stylesheet" href="{{ '/assets/css/timeline.css' | relative_url }}">
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="{{ '/assets/js/timeline.js' | relative_url }}"></script> 