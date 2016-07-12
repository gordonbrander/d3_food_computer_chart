const S_MS = 1000;
const MIN_MS = S_MS * 60;
const HR_MS = MIN_MS * 60;
const DAY_MS = HR_MS * 24;

const SCRUBBER_HEIGHT = 40;
const TOOLTIP_SPACE = 30;
const RATIO_DOMAIN = [0, 1.0];

const isNumber = x => (typeof x === 'number');

const compose = (a, b) => (x) => a(b(x));

const px = n => n + 'px';
const translateXY = (x, y) => 'translateX(' + x + 'px) translateY(' + y + 'px)';

const readX = d => d.x * 1000;
const readY = d => d.y;

const getData = series => series.data;

// Round to 2 decimal places.
const round2x = float =>
  Math.round(float * 100) / 100;

// Flatten an array of arrays into a 1d array.
const flatten = arrays => Array.prototype.concat.apply(Array, arrays);

// Calculate the extent over the whole chart series. In other words, find the
// lowest value and the highest value for the series.
const extentOverSeries = (series, readX) =>
  d3.extent(flatten(series.map(getData)), readX);

const calcPlotWidth = (extent, interval, width) => {
  const durationMs = extent[1] - extent[0];
  const pxPerMs = (width / interval);
  const plotWidth = durationMs * pxPerMs;
  return Math.round(plotWidth);
}

// Make room for tooltip and some padding
const calcPlotHeight = (height, tooltipHeight) =>
  height - (tooltipHeight + SCRUBBER_HEIGHT + (TOOLTIP_SPACE * 2));

const calcSvgHeight = height => height - SCRUBBER_HEIGHT;

const calcXhairTickTop = (height, tooltipHeight) =>
  height - (tooltipHeight + SCRUBBER_HEIGHT + 10 + 3 + TOOLTIP_SPACE);

// Calculate the x scale over the whole chart series.
const calcTimeScale = (domain, interval, width) => {
  return d3.scaleTime()
    .domain(domain)
    .range([0, calcPlotWidth(domain, interval, width)]);
}

const clamp = (v, min, max) => Math.max(Math.min(v, max), min);

const calcTooltipX = (x, width, tooltipWidth) =>
  clamp(x - (tooltipWidth / 2), 0, width - (tooltipWidth));

const findDataPointFromX = (data, currX, readX) => {
  // Used for deriving y value from x position.
  const bisectDate = d3.bisector(readX).left;
  const i = bisectDate(data, currX, 1);
  const d0 = data[i - 1];
  const d1 = data[i];
  // Pick closer of the two.
  const d = currX - readX(d0) > readX(d1) - currX ? d1 : d0;
  return d;
}

const formatTime = d3.timeFormat('%I:%M %p');
const formatDay = d3.timeFormat("%A %b %e, %Y");

const enter = (container, config) => {
  const {width, height, interval, tooltipWidth, tooltipHeight, readX, readY} = config;
  const series = container.datum();

  const extent = extentOverSeries(series, readX);

  const plotWidth = calcPlotWidth(extent, interval, width);
  const plotHeight = calcPlotHeight(height, tooltipHeight);

  const tickTop = calcXhairTickTop(height, tooltipHeight);

  const x = calcTimeScale(extent, interval, width);

  const scrubberXToPlotX = d3.scaleLinear()
    .domain([0, width - 12])
    // Translate up to the point that the right side of the plot is adjacent
    // to the right side of the viewport.
    .range([0, plotWidth - width])
    .clamp(true);

  const xhair = container.append('div')
    .classed('chart-xhair', true);

  const tick = container.append('div')
    .style('transform', translateXY(0, tickTop))
    .classed('chart-xhair--tick', true);

  const tooltip = container.append('div')
    .classed('chart-tooltip', true)
    .style('width', px(tooltipWidth))
    .style('height', px(tooltipHeight));

  const timestamp = tooltip.append('div')
    .classed('chart-timestamp', true);

  const time = timestamp.append('div')
    .classed('chart-timestamp--time', true);

  const day = timestamp.append('div')
    .classed('chart-timestamp--day', true);

  const readouts = tooltip.append('div')
    .classed('chart-readouts', true);

  const scrubber = container.append('div')
    .classed('chart-scrubber', true);

  const progress = scrubber.append('div')
    .classed('chart-progress', true);

  const handle = scrubber.append('div')
    .classed('chart-handle', true);

  handle.append('div')
    .classed('chart-handle--cap', true);

  handle.append('div')
    .classed('chart-handle--line', true);

  const svg = container.append('svg')
    .classed('chart-svg', true);

  const xAxis = svg.append('g')
    .classed('chart-time-axis', true)
    .call(
      d3.axisBottom(x)
      .ticks(d3.timeHour)
      .tickFormat(d3.timeFormat("%I:%M %p %A, %b %e"))
      .tickPadding(0)
    );

  container.selectAll('.tick line')
    .attr('y2', height);

  container.selectAll('.tick text')
    .attr('text-anchor', 'start')
    .attr('transform', 'translate(8)');

  // Define drag behavior
  const handleDrag = d3.drag()
    .on('start', function () {
      d3.select(this).classed('chart-handle--dragging', true);
    })
    .on('drag', function () {
      // Need a scale here for mapping container width to scrubber width
      const [x, y] = d3.mouse(container.node());
      // Clamp scrubber handle x to width - 12, so handle never ends up outside
      // viewport. You can continue to drag mouse past this point, but scrubber
      // will not disappear beyond the fold.
      const cx = clamp(x, 0, width - 12)
      d3.select(this).style('transform', translateXY(cx, 0));
      progress.style('width', px(cx));

      svg.style('transform', translateXY(-1 * scrubberXToPlotX(x), 0));
    })
    .on('end', function () {
      d3.select(this).classed('chart-handle--dragging', false);
    });

  // Attach drag behavior
  handle.call(handleDrag);

  scrubber
    .on('click', function () {
      const [x, y] = d3.mouse(container.node());
      const cx = clamp(x, 0, width - 12);
      handle.style('transform', translateXY(cx, 0));
      progress.style('width', px(cx));

      svg.style('transform', translateXY(-1 * scrubberXToPlotX(x), 0));
    });

  container
    .classed('chart', true)
    .on('mousemove', function () {
      // Adapted from http://bl.ocks.org/mbostock/3902569 (GPL)
      const [mouseX, mouseY] = d3.mouse(this);
      const [plotX, plotY] = d3.mouse(svg.node());
      const x0 = x.invert(plotX);
      const tx = calcTooltipX(mouseX, width, tooltipWidth);
      xhair.style('transform', translateXY(mouseX, 0));
      tick.style('transform', translateXY(mouseX, tickTop));
      tooltip.style('transform', translateXY(tx, 0));

      const date = x.invert(plotX);

      d3.select('.chart-tooltip').selectAll('.chart-timestamp--day')
        .text(formatDay(date));

      d3.select('.chart-tooltip').selectAll('.chart-timestamp--time')
        .text(formatTime(date));

      d3.select('.chart-tooltip').selectAll('.chart-readout--value')
        .style('color', function (group) {
          const {color} = group;
          return color;
        })
        .text(function (group) {
          const {data, unit} = group;
          const d = findDataPointFromX(data, x0, readX);
          const yv = round2x(readY(d));
          return yv + unit;
        });
    });

  return container;
}

// Renders the chart
const update = (container, config) => {
  const {width, height, interval, tooltipHeight, scrubberAt, xhairAt, readX, readY} = config;

  const series = container.datum();

  const extent = extentOverSeries(series, readX);
  const x = calcTimeScale(extent, interval, width);

  // There are 3 kinds of width/height used in this chart:
  //
  // - width/height: the overall outer dimensions of the chart
  // - plotWidth, plotHeight: the dimensions of the plotted lines. This makes
  //   some room for the tooltip. It's also wider than the dimensions of the
  //   chart.
  // - svgWidth, svgHeight: the dimensions of the svg element.
  const plotHeight = calcPlotHeight(height, tooltipHeight);
  const plotWidth = calcPlotWidth(extent, interval, width);
  const svgHeight = calcSvgHeight(height);

  const scrubberRatioToScrubberX = d3.scaleLinear()
    .domain(RATIO_DOMAIN)
    .range([0, width - 12])
    .clamp(true);

  const scrubberRatioToPlotX = d3.scaleLinear()
    .domain(RATIO_DOMAIN)
    // Translate up to the point that the right side of the plot is adjacent
    // to the right side of the viewport.
    .range([0, plotWidth - width])
    .clamp(true);

  container
    .style('width', px(width))
    .style('height', px(height));

  const svg = container.selectAll('svg')
    .attr('width', plotWidth)
    .attr('height', svgHeight);


  const progress = d3.select('.chart-progress');
  const handle = d3.select('.chart-handle');

  // Position elements based on scrubber state
  const scrubberX = scrubberRatioToScrubberX(scrubberAt);
  handle.style('transform', translateXY(scrubberX, 0));
  progress.style('width', px(scrubberX));
  svg.style('transform', translateXY(-1 * scrubberRatioToPlotX(scrubberAt), 0));


  const group = svg.selectAll('.chart-group')
    .data(series);

  group.exit()
    .remove();

  const groupEnter = group.enter()
    .append('g')
      .classed('chart-group', true);

  groupEnter
    .append('path')
      .classed('chart-line', true)
      .style('stroke', group => group.color);

  const groupAll = group.merge(groupEnter);

  groupAll.select('.chart-line')
    .attr('d', group => {
      const {data} = group;

      const domain = isNumber(group.min) && isNumber(group.max) ?
        [group.min, group.max] : d3.extent(data, readY);

      const y = d3.scaleLinear()
        .range([plotHeight, 0])
        .domain(domain);

      const line = d3.line()
        .x(compose(x, readX))
        .y(compose(y, readY));

      return line(data);
    });

  groupAll
    .each(function (group) {
      const {data} = group;

      const chartDot = d3.select(this).selectAll('.chart-dot')
        .data(group.data);

      const chartDotExit = chartDot.exit()
        .remove();

      const chartDotEnter = chartDot.enter()
        .append('circle')
        .attr('class', 'chart-dot')
        .attr("r", 3)
        .style('fill', group.color);

      const domain = isNumber(group.min) && isNumber(group.max) ?
        [group.min, group.max] : d3.extent(data, readY);

      const y = d3.scaleLinear()
        .range([plotHeight, 0])
        .domain(domain);

      const chartDotAll = chartDot.merge(chartDotEnter)
        .attr('cx', compose(x, readX))
        .attr('cy', compose(y, readY));
    });

  const readout = d3.select('.chart-readouts').selectAll('.chart-readout')
    .data(series);

  const readoutEnter = readout.enter()
    .append('div')
    .classed('chart-readout', true);  

  readoutEnter.append('div')
    .classed('chart-readout--legend', true);

  readoutEnter.append('div')
    .classed('chart-readout--title', true);

  const readoutAll = readout.merge(readoutEnter);

  readoutAll.select('.chart-readout--legend')
    .style('background-color', d => d.color);

  readoutAll.select('.chart-readout--title')
    .text(d => d.title);

  readoutEnter.append('div')
    .classed('chart-readout--value', true);

  return container;
}