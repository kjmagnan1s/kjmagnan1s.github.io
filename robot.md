---
layout: robot
permalink: /robot/
title: Robot View - Kevin J. Magnan
---

{% assign d = site.data.site %}

<section class="section">
  <h2>Why This Exists</h2>
  <p>The web now serves two audiences: humans who browse and AI agents that parse. This robot view provides:</p>
  <ul>
    <li>Clean, structured data with stable IDs</li>
    <li>Rich JSON-LD schema markup</li>
    <li>Consistent entity relationships</li>
    <li>Machine-readable content without visual noise</li>
  </ul>
  <p>Both versions share the same data source but optimize for different consumers.</p>
</section>

<section class="section">
  <h2>Person Entity</h2>
  <div class="entity">
    <div class="entity-id">@id: {{ d.person.url }}#me</div>
    <h3>{{ d.person.name }}</h3>
    <p><strong>Role:</strong> {{ d.person.jobTitle }}</p>
    <p><strong>Organization:</strong> <a href="{{ d.person.worksFor.url }}">{{ d.person.worksFor.name }}</a></p>
    <p><strong>Description:</strong> {{ d.person.description }}</p>
    <p><strong>Contact:</strong> <a href="{{ d.person.email }}">{{ d.person.email | remove: 'mailto:' }}</a></p>
    <p><strong>External Profiles:</strong></p>
    <ul>
      {% for profile in d.person.sameAs %}
      <li><a href="{{ profile }}">{{ profile }}</a></li>
      {% endfor %}
    </ul>
  </div>
</section>

<section class="section">
  <h2>About & Background</h2>
  <div class="entity">
    <div class="entity-id">@id: {{ site.url }}/#about</div>
    <p><strong>Overview:</strong> {{ d.about.overview }}</p>
    <p><strong>Background:</strong> {{ d.about.background }}</p>
  </div>
</section>

<section class="section">
  <h2>Skills & Expertise</h2>
  <div class="entity">
    <p><strong>Core Skills:</strong> {{ d.skills | join: ', ' }}</p>
    {% for focus in d.about.focus_areas %}
    <div style="margin: 1rem 0;">
      <strong>{{ focus.area }}:</strong> {{ focus.description }}
    </div>
    {% endfor %}
  </div>
</section>

<section class="section">
  <h2>Professional Experience</h2>
  {% for job in d.experience %}
  <div class="entity">
    <div class="entity-id">@id: {{ site.url }}/#experience-{{ forloop.index }}</div>
    <h3>{{ job.company }}</h3>
    <p><strong>Location:</strong> {{ job.location }}</p>
    {% for position in job.positions %}
    <div style="margin: 1rem 0; padding-left: 1rem; border-left: 2px solid #333;">
      <h4>{{ position.title }}</h4>
      <p><strong>Period:</strong> {{ position.period }}</p>
      {% if position.achievements %}
      <p><strong>Key Achievements:</strong></p>
      <ul>
        {% for achievement in position.achievements %}
        <li>{{ achievement }}</li>
        {% endfor %}
      </ul>
      {% endif %}
    </div>
    {% endfor %}
  </div>
  {% endfor %}
</section>

<section class="section">
  <h2>Education</h2>
  {% for edu in d.education %}
  <div class="entity">
    <div class="entity-id">@id: {{ site.url }}/#education-{{ forloop.index }}</div>
    <h3>{{ edu.institution }}</h3>
    <p><strong>Location:</strong> {{ edu.location }}</p>
    <p><strong>Degree:</strong> {{ edu.degree }}</p>
    {% if edu.honors %}
    <p><strong>Honors:</strong> {{ edu.honors }}</p>
    {% endif %}
  </div>
  {% endfor %}
</section>

<section class="section">
  <h2>Certifications</h2>
  <div class="entity">
    <div class="entity-id">@id: {{ site.url }}/#certifications</div>
    {% for cert in d.certifications %}
    <div style="margin: 0.5rem 0;">
      <strong>{{ cert.name }}</strong> ({{ cert.year }})
    </div>
    {% endfor %}
  </div>
</section>

<section class="section">
  <h2>Work Portfolio</h2>
  {% for project in d.projects %}
  <div class="entity">
    <div class="entity-id">@id: {{ site.url }}{{ project.url }}</div>
    <h3>{{ project.name }}</h3>
    <p><strong>Type:</strong> {{ project.type }}</p>
    <p><strong>Summary:</strong> {{ project.summary }}</p>
    <p><strong>Tags:</strong> {{ project.tags | join: ', ' }}</p>
    <p><strong>URL:</strong> <a href="{{ project.url }}">{{ site.url }}{{ project.url }}</a></p>
  </div>
  {% endfor %}
</section>

<section class="section">
  <h2>All Publications & Blog Posts</h2>
  <div class="entity">
    <div class="entity-id">@id: {{ site.url }}/#publications</div>
    <p><strong>Total Posts:</strong> {{ site.posts.size }}</p>
    <p><strong>Date Range:</strong> {{ site.posts.last.date | date: "%Y" }} - {{ site.posts.first.date | date: "%Y" }}</p>
  </div>
  
  {% for post in site.posts %}
  <div class="entity">
    <div class="entity-id">@id: {{ site.url }}{{ post.url }}</div>
    <h3><a href="{{ post.url }}">{{ post.title }}</a></h3>
    <p><strong>Date:</strong> {{ post.date | date: "%Y-%m-%d" }}</p>
    {% if post.categories and post.categories.size > 0 %}
    <p><strong>Categories:</strong> {{ post.categories | join: ', ' }}</p>
    {% endif %}
    {% if post.description %}
    <p><strong>Summary:</strong> {{ post.description }}</p>
    {% endif %}
    {% if post.external_url %}
    <p><strong>External URL:</strong> <a href="{{ post.external_url }}">{{ post.external_url }}</a></p>
    {% endif %}
    {% if post.thumbnail %}
    <p><strong>Thumbnail:</strong> {{ site.url }}{{ post.thumbnail }}</p>
    {% endif %}
  </div>
  {% endfor %}
</section>
