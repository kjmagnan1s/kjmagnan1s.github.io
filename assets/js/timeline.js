/* jshint esversion: 6 */
document.addEventListener("DOMContentLoaded", () => {
  // Inject Jekyll data into JS via a <script> tag
  const data = JSON.parse(document.getElementById("__career-data").textContent);

  const width  = 900;
  const height = 120 * data.length;

  const svg = d3.select("#timeline")
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`);

  // Create tooltip div
  const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip");

  // Time scale
  const parse = d3.timeParse("%Y-%m-%d");
  data.forEach(d => { d.start = parse(d.start); d.end = parse(d.end); });

  const x = d3.scaleTime()
      .domain([d3.min(data, d => d.start), d3.max(data, d => d.end)])
      .range([100, width - 50]);

  // Axis line
  svg.append("line")
     .attr("class", "timeline-line")
     .attr("x1", x.range()[0])
     .attr("x2", x.range()[1])
     .attr("y1", 20)
     .attr("y2", height - 40);

  // Nodes
  const g = svg.selectAll("g.node")
      .data(data)
      .enter().append("g")
      .attr("transform", (d, i) => `translate(0, ${i * 100 + 40})`);

  const circles = g.append("circle")
     .attr("class", "timeline-node")
     .attr("cx", d => x(d.start))
     .attr("r", 8)
     .on("mouseover", function(event, d) {
       tooltip
         .html(`<strong>${d.title}</strong><br>${d.org}<br>${d.blurb}`)
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
       tooltip.classed("visible", false);
     });

  // Labels
  g.append("text")
     .attr("class", "timeline-text")
     .attr("x", d => x(d.start) + 15)
     .attr("y", 4)
     .text(d => `${d.title} — ${d.org}`);

  g.append("text")
     .attr("class", "timeline-text")
     .attr("x", d => x(d.start) + 15)
     .attr("y", 22)
     .style("fill", "var(--text-light)")
     .text(d => d.blurb);

  // Animation on scroll
  const animateNodes = () => {
    const timeline = document.getElementById('timeline');
    const timelinePosition = timeline.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    if (timelinePosition.top < windowHeight * 0.8 && timelinePosition.bottom > 0) {
      circles
        .transition()
        .duration(1000)
        .attr("r", 12)
        .ease(d3.easeBounce)
        .transition()
        .duration(500)
        .attr("r", 8);
    }
  };

  // Initial check and scroll listener
  animateNodes();
  window.addEventListener('scroll', animateNodes);
}); 