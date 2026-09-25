---
layout: page
title: What I am building
permalink: /building/
description: The products and open source tools Kevin Magnan is building right now.
---

{% assign d = site.data.site %}

<article class="building-page">
  <header class="building-header">
    <h1>What I am building</h1>
    <p class="building-intro">Three businesses and a set of open source tools. Everything here is live, and everything here gets used in real work.</p>
  </header>

  <section class="building-section" id="products">
    <h2>Products</h2>
    <ul class="building-list">
      {% for item in d.products %}
      <li class="building-item">
        <h3><a href="{{ item.url }}" rel="noopener" target="_blank">{{ item.name }}</a></h3>
        <p>{{ item.summary }}</p>
      </li>
      {% endfor %}
    </ul>
  </section>

  <section class="building-section" id="builds">
    <h2>Open source tools</h2>
    <ul class="building-list">
      {% for item in d.builds %}
      <li class="building-item">
        <h3><a href="{{ item.url }}" rel="noopener" target="_blank">{{ item.name }}</a></h3>
        <p>{{ item.summary }}</p>
      </li>
      {% endfor %}
    </ul>
  </section>

  <p class="building-back"><a href="{{ '/' | relative_url }}">Back to the front page</a></p>
</article>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "@id": "{{ site.url }}{{ page.url }}#building",
  "name": "What Kevin Magnan is building",
  "url": "{{ site.url }}{{ page.url }}",
  "numberOfItems": {{ d.products.size | plus: d.builds.size }},
  "itemListElement": [
    {% for item in d.products %}
    {
      "@type": "ListItem",
      "position": {{ forloop.index }},
      "item": {
        "@type": "Organization",
        "@id": "{{ item.url }}",
        "name": "{{ item.name }}",
        "url": "{{ item.url }}",
        "description": "{{ item.summary | escape }}"
      }
    },
    {% endfor %}
    {% for item in d.builds %}
    {
      "@type": "ListItem",
      "position": {{ forloop.index | plus: d.products.size }},
      "item": {
        "@type": "SoftwareSourceCode",
        "@id": "{{ item.url }}",
        "name": "{{ item.name }}",
        "codeRepository": "{{ item.url }}",
        "description": "{{ item.summary | escape }}",
        "author": { "@id": "{{ d.person.url }}#me" }
      }
    }{% unless forloop.last %},{% endunless %}
    {% endfor %}
  ]
}
</script>
