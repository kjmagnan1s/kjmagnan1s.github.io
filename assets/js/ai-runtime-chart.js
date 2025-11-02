/* global d3 */
(function () {
  const chartRoot = document.querySelector('[data-ai-runtime-chart]');
  if (!chartRoot) return;

  const dataUrl = chartRoot.getAttribute('data-data-url');
  if (!dataUrl) return;

  const state = {
    metric: 'p50',
    scale: 'log'
  };

  const dimensions = {
    width: 900,
    height: 520,
    margin: { top: 60, right: 40, bottom: 70, left: 120 }
  };

  const svg = d3
    .select(chartRoot)
    .append('svg')
    .attr(
      'viewBox',
      `0 0 ${dimensions.width} ${dimensions.height}`
    )
    .attr('role', 'img')
    .attr('aria-labelledby', 'ai-runtime-chart-title');

  const title = svg
    .append('text')
    .attr('id', 'ai-runtime-chart-title')
    .attr('x', dimensions.width / 2)
    .attr('y', 28)
    .attr('text-anchor', 'middle')
    .attr('class', 'ai-runtime-chart__title')
    .text('AI Agent Uninterrupted Runtime (Historical + Forecast)');

  const chart = svg
    .append('g')
    .attr(
      'transform',
      `translate(${dimensions.margin.left}, ${dimensions.margin.top})`
    );

  const innerWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;
  const innerHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  const scales = {
    x: d3.scaleTime().range([0, innerWidth]),
    yLinear: d3.scaleLinear().range([innerHeight, 0]),
    yLog: d3.scaleLog().range([innerHeight, 0])
  };

  const xAxisGroup = chart
    .append('g')
    .attr('class', 'ai-runtime-chart__axis ai-runtime-chart__axis--x')
    .attr('transform', `translate(0, ${innerHeight})`);

  const yAxisGroup = chart
    .append('g')
    .attr('class', 'ai-runtime-chart__axis ai-runtime-chart__axis--y');

  const legendGroup = svg
    .append('g')
    .attr('class', 'ai-runtime-chart__legend')
    .attr('transform', `translate(${dimensions.margin.left}, ${
      dimensions.margin.top - 20
    })`);

  const lineGroup = chart.append('g').attr('class', 'ai-runtime-chart__lines');
  const errorGroup = chart
    .append('g')
    .attr('class', 'ai-runtime-chart__error-bars');
  const dotsGroup = chart.append('g').attr('class', 'ai-runtime-chart__dots');

  const controls = buildControls();
  chartRoot.prepend(controls);

  fetch(dataUrl)
    .then((response) => response.json())
    .then((rawData) => {
      const data = rawData
        .map((d) => ({
          ...d,
          date: new Date(d.releaseDate),
          metrics: d.metrics || {}
        }))
        .sort((a, b) => a.date - b.date);

      render(data);
      window.addEventListener('resize', () => render(data));
    })
    .catch((error) => {
      console.error('Failed to load AI runtime data', error);
    });

  function buildControls() {
    const wrapper = document.createElement('div');
    wrapper.className = 'ai-runtime-chart__controls';

    const successToggle = document.createElement('div');
    successToggle.className = 'ai-runtime-chart__toggle';
    successToggle.setAttribute('role', 'group');
    successToggle.setAttribute('aria-label', 'Success threshold');
    wrapper.appendChild(successToggle);

    const metricOptions = [
      { label: '50% Success', value: 'p50' },
      { label: '80% Success', value: 'p80' }
    ];

    metricOptions.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ai-runtime-chart__button';
      button.textContent = option.label;
      button.dataset.value = option.value;
      if (state.metric === option.value) button.classList.add('is-active');
      button.addEventListener('click', () => {
        state.metric = option.value;
        updateActiveButtons(successToggle, option.value);
        renderLatest();
      });
      successToggle.appendChild(button);
    });

    const scaleToggle = document.createElement('div');
    scaleToggle.className = 'ai-runtime-chart__toggle';
    scaleToggle.setAttribute('role', 'group');
    scaleToggle.setAttribute('aria-label', 'Scale mode');
    wrapper.appendChild(scaleToggle);

    const scaleOptions = [
      { label: 'Log Scale', value: 'log' },
      { label: 'Linear Scale', value: 'linear' }
    ];

    scaleOptions.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ai-runtime-chart__button';
      button.textContent = option.label;
      button.dataset.value = option.value;
      if (state.scale === option.value) button.classList.add('is-active');
      button.addEventListener('click', () => {
        state.scale = option.value;
        updateActiveButtons(scaleToggle, option.value);
        renderLatest();
      });
      scaleToggle.appendChild(button);
    });

    return wrapper;

    function updateActiveButtons(group, value) {
      [...group.querySelectorAll('button')].forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.value === value);
      });
    }
  }

  let latestData = [];

  function render(data) {
    latestData = data;
    renderLatest();
  }

  function renderLatest() {
    if (!latestData.length) return;

    const points = latestData.filter(
      (d) => d.metrics[state.metric] && d.metrics[state.metric].estimate
    );
    if (!points.length) return;

    const yAccessor = (d) => d.metrics[state.metric].estimate;
    const xExtent = d3.extent(points, (d) => d.date);
    const yExtent = d3.extent(points, yAccessor);

    const historical = points.filter((d) => d.series === 'historical');
    const forecast = points.filter((d) => d.series === 'forecast');

    const minY = Math.min(...yExtent);
    const maxY = Math.max(...yExtent);

    const yLinearDomain = [0, maxY * 1.15];
    const yLogDomain = [
      Math.max(minY * 0.7, 0.01),
      maxY * 1.3
    ];

    scales.x.domain([xExtent[0], xExtent[1]]);
    scales.yLinear.domain(yLinearDomain);
    scales.yLog.domain(yLogDomain);

    const yScale = state.scale === 'linear' ? scales.yLinear : scales.yLog;
    const xAxis = d3.axisBottom(scales.x).ticks(6).tickFormat(d3.timeFormat('%b %Y'));
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(state.scale === 'linear' ? 6 : 6, '~f')
      .tickFormat((d) => formatDuration(d));

    xAxisGroup.transition().duration(600).call(xAxis);
    yAxisGroup.transition().duration(600).call(yAxis);

    xAxisGroup
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-0.6em')
      .attr('dy', '0.15em')
      .attr('transform', 'rotate(-30)');

    yAxisGroup
      .selectAll('text')
      .style('text-anchor', 'end');

    drawLegend();

    const lineGenerator = d3
      .line()
      .defined((d) => !!yAccessor(d))
      .x((d) => scales.x(d.date))
      .y((d) => yScale(yAccessor(d)));

    const historicalPath = lineGroup.selectAll('.line-historical').data([historical]);
    historicalPath
      .join('path')
      .attr('class', 'line-historical')
      .attr('fill', 'none')
      .attr('stroke', 'var(--ai-runtime-historical)')
      .attr('stroke-width', 2.5)
      .attr('d', lineGenerator);

    const forecastPath = lineGroup.selectAll('.line-forecast').data([forecast]);
    forecastPath
      .join('path')
      .attr('class', 'line-forecast')
      .attr('fill', 'none')
      .attr('stroke', 'var(--ai-runtime-forecast)')
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '6 4')
      .attr('d', lineGenerator);

    const allCircles = dotsGroup.selectAll('g').data(points, (d) => d.rawModel + state.metric);

    const circlesEnter = allCircles
      .enter()
      .append('g')
      .attr('class', 'ai-runtime-chart__dot');

    circlesEnter
      .append('circle')
      .attr('r', 6)
      .attr('stroke-width', 2);

    circlesEnter.append('title');

    const merged = circlesEnter.merge(allCircles);

    merged
      .select('circle')
      .attr('cx', (d) => scales.x(d.date))
      .attr('cy', (d) => yScale(yAccessor(d)))
      .attr('fill', (d) =>
        d.series === 'historical'
          ? 'var(--ai-runtime-historical)'
          : 'var(--ai-runtime-forecast-fill)'
      )
      .attr('stroke', (d) =>
        d.series === 'historical'
          ? 'var(--ai-runtime-historical)'
          : 'var(--ai-runtime-forecast)'
      )
      .attr('stroke-dasharray', (d) => (d.series === 'historical' ? null : '4 3'));

    merged
      .select('title')
      .text((d) => {
        const value = yAccessor(d);
        const ci = d.metrics[state.metric];
        const ciText =
          ci.ciLow && ci.ciHigh
            ? ` (CI: ${formatDuration(ci.ciLow)} – ${formatDuration(ci.ciHigh)})`
            : '';
        return `${d.model} • ${d3.timeFormat('%b %d, %Y')(d.date)} • ${formatDuration(
          value
        )}${ciText}`;
      });

    allCircles
      .exit()
      .transition()
      .duration(200)
      .style('opacity', 0)
      .remove();

    const errorData = points.filter((d) => {
      const metric = d.metrics[state.metric];
      return metric.ciLow && metric.ciHigh;
    });

    const errorBars = errorGroup
      .selectAll('line')
      .data(errorData, (d) => d.rawModel + state.metric);

    errorBars
      .join(
        (enter) =>
          enter
            .append('line')
            .attr('stroke', 'rgba(51, 65, 85, 0.35)')
            .attr('stroke-width', 2)
            .attr('x1', (d) => scales.x(d.date))
            .attr('x2', (d) => scales.x(d.date)),
        (update) => update,
        (exit) => exit.remove()
      )
      .attr('y1', (d) => yScale(d.metrics[state.metric].ciHigh))
      .attr('y2', (d) => yScale(d.metrics[state.metric].ciLow));
  }

  function drawLegend() {
    const legendData = [
      { label: 'Historical', class: 'historical' },
      { label: 'Forecast (7 month doubling)', class: 'forecast' }
    ];

    const items = legendGroup.selectAll('g').data(legendData);

    const itemsEnter = items
      .enter()
      .append('g')
      .attr('transform', (d, i) => `translate(${i * 200}, 0)`);

    itemsEnter
      .append('line')
      .attr('x1', 0)
      .attr('x2', 36)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke-width', 3);

    itemsEnter
      .append('text')
      .attr('dx', 44)
      .attr('dy', 5)
      .attr('class', 'ai-runtime-chart__legend-text');

    const merged = itemsEnter.merge(items);

    merged
      .select('line')
      .attr('stroke', (d) =>
        d.class === 'historical'
          ? 'var(--ai-runtime-historical)'
          : 'var(--ai-runtime-forecast)'
      )
      .attr('stroke-dasharray', (d) => (d.class === 'forecast' ? '6 4' : null));

    merged.select('text').text((d) => d.label);

    items.exit().remove();
  }

  function formatDuration(minutes) {
    if (!Number.isFinite(minutes)) return '';
    if (minutes < 1) {
      const seconds = minutes * 60;
      if (seconds < 10) return `${seconds.toFixed(1)} sec`;
      return `${Math.round(seconds)} sec`;
    }
    if (minutes < 60) {
      if (minutes < 10) return `${minutes.toFixed(1)} min`;
      return `${Math.round(minutes)} min`;
    }
    const hours = minutes / 60;
    if (hours < 24) {
      if (hours < 10) return `${hours.toFixed(1)} hr`;
      return `${Math.round(hours)} hr`;
    }
    const days = hours / 24;
    if (days < 30) {
      if (days < 10) return `${days.toFixed(1)} days`;
      return `${Math.round(days)} days`;
    }
    const months = days / 30;
    if (months < 12) {
      return `${months.toFixed(1)} months`;
    }
    const years = months / 12;
    return `${years.toFixed(1)} years`;
  }
})();
