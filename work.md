---
layout: page
title: Selected work
permalink: /work/
description: Client projects in public-sector modernization, with the problem, the approach, and the result for each.
---

<section class="work-page">
  <div class="section-container">
    <p class="lead">Client projects from my consulting work. Each one is a public-sector agency moving off custom or legacy systems onto something an agency can run itself.</p>

    <ul class="work-list">
    {% for p in site.data.site.projects %}
      <li class="work-item" id="{{ p.id }}">
        <h2><a href="/work/#{{ p.id }}">{{ p.name }}</a></h2>
        <p class="work-type">{{ p.type }}</p>
        <p>{{ p.summary }}</p>
        <ul class="work-tags">
        {% for t in p.tags %}<li>{{ t }}</li>{% endfor %}
        </ul>
      </li>
    {% endfor %}
    </ul>

    <p>Products and open-source tools live on the <a href="/building/">Building</a> page. The full history is on the <a href="/resume/">resume</a>.</p>
  </div>
</section>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Kevin Magnan - Selected work",
  "itemListElement": [
  {% for p in site.data.site.projects %}
    {
      "@type": "ListItem",
      "position": {{ forloop.index }},
      "item": {
        "@type": "CreativeWork",
        "@id": "{{ site.url }}/work/#{{ p.id }}",
        "name": "{{ p.name }}",
        "description": {{ p.summary | jsonify }},
        "genre": "{{ p.type }}",
        "url": "{{ site.url }}/work/#{{ p.id }}"
      }
    }{% unless forloop.last %},{% endunless %}
  {% endfor %}
  ]
}
</script>
