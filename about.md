---
layout: page
title: About Me
permalink: /about/
---

<div class="about-page">
  <div class="about-header" data-aos="fade-up">
    <img src="{{ '/assets/images/headshot.png' | relative_url }}" alt="Kevin Magnan" class="profile-image">
    <h1>Kevin J. Magnan</h1>
    <p class="subtitle">Principal Consultant & Technology Lead at Slalom</p>
  </div>

  <div class="about-content" data-aos="fade-up">
    <section class="about-section">
      <h2>Professional Overview</h2>
      <p>I'm a Principal Consultant and Technology Lead at Slalom, where I co-lead our Justice and Public Safety (JPS) industry. My work is focused on modernizing public sector services through data strategy, analytics, and AI, helping agencies navigate complex challenges with clarity, innovation, and purpose.</p>
      
      <p>Before joining Slalom, I built my career at the intersection of public service and analytics. I began as a police officer, gaining first-hand experience in the operational, structural, and human challenges faced by law enforcement and justice agencies. That real-world perspective shaped my transition into data strategy and technology consulting, where I've since worked as a researcher, analyst, and technical advisor for a range of public sector stakeholders.</p>
    </section>

    <section class="about-section">
      <h2>Areas of Focus</h2>
      <div class="expertise-grid">
        <div class="expertise-card">
          <i class="fas fa-shield-alt"></i>
          <h3>Public Safety Modernization</h3>
          <p>Transforming public safety systems with modern technology and data-driven approaches</p>
        </div>
        <div class="expertise-card">
          <i class="fas fa-database"></i>
          <h3>Data Strategy</h3>
          <p>Developing comprehensive data governance and analytics frameworks</p>
        </div>
        <div class="expertise-card">
          <i class="fas fa-chart-line"></i>
          <h3>Analytics Design</h3>
          <p>Creating intuitive dashboards and analytics solutions for decision-making</p>
        </div>
        <div class="expertise-card">
          <i class="fas fa-cloud"></i>
          <h3>Cloud Architecture</h3>
          <p>Designing scalable and secure cloud-based solutions for government</p>
        </div>
        <div class="expertise-card">
          <i class="fas fa-robot"></i>
          <h3>AI Strategy</h3>
          <p>Implementing AI and automation solutions for public sector efficiency</p>
        </div>
      </div>
    </section>

    <section class="about-section">
      <h2>Impact & Approach</h2>
      <p>Throughout my career, I've partnered with city, county, and state-level organizations to design solutions that turn data into action, whether to improve service delivery, drive equity-focused outcomes, or enhance transparency and accountability. I've led work on initiatives ranging from socio-economic impact research to dashboard development and AI implementation strategies.</p>

      <p>At Slalom, I bring that full-spectrum experience to bear: leading technical solutioning, analytics delivery, and industry thought leadership across our JPS portfolio. I'm deeply committed to helping mission-driven institutions modernize with care, especially in ways that prioritize the needs of underserved or disproportionately impacted communities.</p>
    </section>

    <section class="about-section">
      <h2>About This Site</h2>
      <p>You'll find this site filled with the ideas, tools, and solutions I work on, from interactive dashboards and technical code to reflections on AI, public safety, and the future of government.</p>
    </section>
  </div>
</div>

<style>
.about-page {
  padding: 2rem 0;
  max-width: 1200px;
  margin: 0 auto;
}

.about-header {
  text-align: center;
  margin-bottom: 4rem;
}

.profile-image {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  margin-bottom: 2rem;
  object-fit: cover;
  border: 3px solid var(--primary-color);
}

.subtitle {
  color: var(--text-light);
  font-size: 1.25rem;
  margin-bottom: 2rem;
}

.about-section {
  margin-bottom: 4rem;
}

.expertise-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.expertise-card {
  padding: 2rem;
  background-color: var(--background-alt);
  border-radius: 0.5rem;
  text-align: center;
}

.expertise-card i {
  font-size: 2.5rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.expertise-card h3 {
  margin-bottom: 1rem;
}

.timeline {
  position: relative;
  max-width: 800px;
  margin: 2rem auto;
}

.timeline::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 100%;
  background-color: var(--border-color);
  transform: translateX(-50%);
}

.timeline-item {
  margin-bottom: 3rem;
  position: relative;
  width: 50%;
}

.timeline-item:nth-child(odd) {
  left: 0;
  padding-right: 3rem;
}

.timeline-item:nth-child(even) {
  left: 50%;
  padding-left: 3rem;
}

.timeline-content {
  background-color: var(--background-alt);
  padding: 1.5rem;
  border-radius: 0.5rem;
  position: relative;
}

.timeline-content::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: var(--primary-color);
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
}

.timeline-item:nth-child(odd) .timeline-content::before {
  right: -40px;
}

.timeline-item:nth-child(even) .timeline-content::before {
  left: -40px;
}

.timeline-date {
  color: var(--text-light);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .timeline::before {
    left: 0;
  }

  .timeline-item {
    width: 100%;
    padding-left: 2rem;
  }

  .timeline-item:nth-child(odd) {
    padding-right: 0;
  }

  .timeline-item:nth-child(even) {
    left: 0;
  }

  .timeline-content::before {
    left: -30px !important;
  }
}
</style>

<!-- Return to Top Button -->
<button id="returnToTop" class="return-to-top" title="Return to top">
  <i class="fas fa-arrow-up"></i>
</button>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const returnToTop = document.getElementById('returnToTop');
  
  // Show button when scrolling down
  window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
      returnToTop.style.display = 'block';
    } else {
      returnToTop.style.display = 'none';
    }
  });
  
  // Smooth scroll to top when clicked
  returnToTop.addEventListener('click', function() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
});
</script>

<style>
.return-to-top {
  display: none;
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
  z-index: 1000;
}

.return-to-top:hover {
  background-color: var(--primary-color-dark);
}
</style>
