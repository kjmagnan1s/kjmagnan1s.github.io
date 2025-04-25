/* jshint esversion: 6 */
document.addEventListener("DOMContentLoaded", () => {
  const data = JSON.parse(document.getElementById("__career-data").textContent);
  const margin = { top: 40, right: 40, bottom: 40, left: 100 };
  const width = 1200 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  // Create SVG with zoom behavior
  const svg = d3.select("#timeline")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add zoom controls
  const zoomControls = d3.select("#timeline")
    .append("div")
    .attr("class", "zoom-controls");

  zoomControls.append("button")
    .attr("class", "zoom-button")
    .text("+")
    .on("click", () => svg.transition().call(zoom.scaleBy, 2));

  zoomControls.append("button")
    .attr("class", "zoom-button")
    .text("-")
    .on("click", () => svg.transition().call(zoom.scaleBy, 0.5));

  // Parse dates
  const parse = d3.timeParse("%Y-%m-%d");
  data.forEach(d => {
    d.start = parse(d.start);
    d.end = parse(d.end);
  });

  // Create scales
  const x = d3.scaleTime()
    .domain([d3.min(data, d => d.start), d3.max(data, d => d.end)])
    .range([0, width]);

  const y = d3.scalePoint()
    .domain(data.map(d => d.title))
    .range([0, height])
    .padding(0.5);

  // Create curved path generator
  const line = d3.line()
    .curve(d3.curveBasis)
    .x(d => x(d))
    .y((d, i) => y(data[i].title));

  // Add curved path
  const path = svg.append("path")
    .attr("class", "timeline-path")
    .attr("d", line(data.map(d => d.start)));

  // Add date range highlights
  data.forEach((d, i) => {
    svg.append("rect")
      .attr("class", "date-range")
      .attr("x", x(d.start))
      .attr("y", y(d.title) - 20)
      .attr("width", x(d.end) - x(d.start))
      .attr("height", 40)
      .attr("rx", 4);
  });

  // Create tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

  // Add nodes with animations
  const nodes = svg.selectAll(".node")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${x(d.start)},${y(d.title)})`);

  // Add circles with glow effect
  nodes.append("circle")
    .attr("class", "timeline-node")
    .attr("r", 8)
    .on("mouseover", function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", 12);

      tooltip
        .html(`
          <div class="tooltip-title">${d.title}</div>
          <div class="tooltip-org">${d.org}</div>
          <div class="tooltip-dates">${d.start.toLocaleDateString()} - ${d.end.getFullYear() === 9999 ? "Present" : d.end.toLocaleDateString()}</div>
          <div class="tooltip-blurb">${d.blurb}</div>
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px")
        .classed("visible", true);
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("r", 8);
      tooltip.classed("visible", false);
    });

  // Add labels
  nodes.append("text")
    .attr("class", "timeline-text")
    .attr("x", 15)
    .attr("y", 4)
    .text(d => d.title);

  nodes.append("text")
    .attr("class", "timeline-date")
    .attr("x", 15)
    .attr("y", 20)
    .text(d => `${d.start.getFullYear()} - ${d.end.getFullYear() === 9999 ? "Present" : d.end.getFullYear()}`);

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .on("zoom", (event) => {
      svg.attr("transform", event.transform);
    });

  svg.call(zoom);

  // Animate on scroll
  const animateTimeline = () => {
    const timeline = document.getElementById('timeline');
    const timelinePosition = timeline.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    if (timelinePosition.top < windowHeight * 0.8 && timelinePosition.bottom > 0) {
      // Animate path
      const pathLength = path.node().getTotalLength();
      path
        .attr("stroke-dasharray", pathLength)
        .attr("stroke-dashoffset", pathLength)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

      // Animate nodes
      nodes.selectAll("circle")
        .attr("r", 0)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 200)
        .attr("r", 8)
        .ease(d3.easeBounce);
    }
  };

  // Initial animation and scroll listener
  animateTimeline();
  window.addEventListener('scroll', animateTimeline);
}); 