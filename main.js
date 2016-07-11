const S_MS = 1000;
const MIN_MS = S_MS * 60;
const HR_MS = MIN_MS * 60;
const DAY_MS = HR_MS * 24;

const isNumber = x => (typeof x === 'number');

const compose = (a, b) => (x) => a(b(x));

const px = n => n + 'px';
const translateX = n => 'translateX(' + n + 'px)';

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

const enter = (container, config) => {
  const {width, interval, tooltipWidth, readX, readY} = config;
  const series = container.datum();

  const extent = extentOverSeries(series, readX);
  const plotWidth = calcPlotWidth(extent, interval, width);
  const x = calcTimeScale(extent, interval, width);

  const widthToPlotWidth = d3.scaleLinear()
    .domain([0, width])
    .range([0, plotWidth]);

  const xhair = container.append('div')
    .classed('chart-xhair', true);

  const tooltip = container.append('div')
    .classed('chart-tooltip', true)
    .style('width', px(tooltipWidth));

  const time = tooltip.append('div')
    .classed('chart-time', true);

  const scrubber = container.append('div')
    .classed('chart-scrubber', true);

  const progress = scrubber.append('div')
    .classed('chart-progress', true);

  const threshold = scrubber.append('div')
    .classed('chart-threshold', true);

  threshold.append('div')
    .classed('chart-threshold--cap', true);

  threshold.append('div')
    .classed('chart-threshold--line', true);

  const svg = container.append('svg');

  // Define drag behavior
  const thresholdDrag = d3.drag()
    .on('start', function () {
      d3.select(this).classed('chart-threshold--dragging', true);
    })
    .on('drag', function () {
      const [x, y] = d3.mouse(container.node());
      const cx = clamp(x, 0, width);
      d3.select(this).style('transform', translateX(cx));
      progress.style('width', px(cx));

      svg.style('transform', translateX(-1 * widthToPlotWidth(cx)));
    })
    .on('end', function () {
      d3.select(this).classed('chart-threshold--dragging', false);
    });

  // Attach drag behavior
  threshold.call(thresholdDrag);

  container
    .classed('chart', true)
    .on('mousemove', function () {
      // Adapted from http://bl.ocks.org/mbostock/3902569 (GPL)
      const [mouseX, mouseY] = d3.mouse(this);
      const [plotX, plotY] = d3.mouse(svg.node());
      const x0 = x.invert(plotX);
      const tx = calcTooltipX(mouseX, width, tooltipWidth);
      xhair.style('transform', translateX(mouseX));
      tooltip.style('transform', translateX(tx));

      d3.select('.chart-tooltip').selectAll('.chart-time')
        .text(x.invert(plotX));

      d3.select('.chart-tooltip').selectAll('.chart-readout--value')
        .text(function (group) {
          const {data} = group;
          const d = findDataPointFromX(data, x0, readX);
          const yv = readY(d);
          return round2x(yv);
        });
    });

  return container;
}

// Renders the chart
const update = (container, config) => {
  const {width, height, interval, readX, readY} = config;
  const plotHeight = height - 180;

  const series = container.datum();

  const extent = extentOverSeries(series, readX);
  const plotWidth = calcPlotWidth(extent, interval, width);
  const x = calcTimeScale(extent, interval, width);

  container
    .style('width', px(width))
    .style('height', px(height));

  const svg = container.selectAll('svg')
    .attr('width', plotWidth)
    .attr('height', plotHeight);

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

  const readout = d3.select('.chart-tooltip').selectAll('.chart-readout')
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

const series = [
  {
    title: 'Water Temperature',
    color: '#00a5ed',
    data: DATA2,
    unit: '°C'
  },
  {
    title: 'Air Temperature',
    color: '#0052b3',
    data: DATA,
    unit: '°C',
    min: 7.2,
    max: 48.8
  }
];

const container = d3.select('#chart').datum(series);

const config = {
  // Duration to show within chart.
  interval: HR_MS,
  width: 800,
  height: 600,
  tooltipWidth: 240,
  readX,
  readY
};

enter(container, config);
update(container, config);