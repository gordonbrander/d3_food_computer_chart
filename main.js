const width = 600;
const height = 300;

const compose = (a, b) => (x) => a(b(x));

const px = n => n + 'px';

const readX = d => d.x;
const readY = d => d.y;

// Round to 2 decimal places.
const round2x = float =>
  Math.round(float * 100) / 100;

// var xAxis = d3.axisBottom(x);
// var yAxis = d3.axisLeft(y);

const calcX = (data, width, readX) =>
  d3.scaleTime()
    .range([0, width])
    .domain(d3.extent(data, readX));

const calcY = (data, height, readY) =>
  d3.scaleLinear()
    .range([height, 0])
    .domain(d3.extent(data, readY));

const calcD = (data, width, height, readX, readY) => {
  const line = d3.line()
    .x(compose(calcX(data, width, readX), readX))
    .y(compose(calcY(data, height, readY), readY));

  return line(data);
}

const calcTooltipX = (x, width, tooltipWidth) => {
  const halfTooltipWidth = (tooltipWidth / 2);
  return (x + halfTooltipWidth) > width ?
    (width - halfTooltipWidth) :
    (x - halfTooltipWidth) < 0 ?
    halfTooltipWidth :
    x;
}

const enter = (container, config) => {
  const {width, tooltipWidth, readX, readY} = config;
  const series = container.datum();

  const xhair = container.append('div')
    .classed('chart-xhair', true);

  const tooltip = container.append('div')
    .classed('chart-tooltip', true)
    .style('width', px(tooltipWidth))
    .style('margin-left', px(-1 * (tooltipWidth / 2)));

  container.append('svg');

  // Used for deriving y value from x position.
  const bisectDate = d3.bisector(readX).left;

  container
    .classed('chart', true)
    .on('mousemove', function () {
      const x = d3.event.clientX - this.offsetLeft;
      const tx = calcTooltipX(x, width, tooltipWidth);
      xhair.style('left', px(x));
      tooltip.style('left', px(tx));

      d3.select('.chart-tooltip').selectAll('.chart-readout--value')
        .text(function (group) {
          // Adapted from http://bl.ocks.org/mbostock/3902569 (GPL)
          const x = calcX(group.data, width, readX);
          const x0 = x.invert(d3.mouse(this)[0]);
          const i = bisectDate(data, x0, 1);
          const d0 = data[i - 1];
          const d1 = data[i];
          // Pick closer of the two.
          const d = x0 - readX(d0) > readX(d1) - x0 ? d1 : d0;
          const y = readY(d);
          return round2x(y);
        });
    });

  return container;
}

// Renders the chart
const update = (container, config) => {
  const {width, height, readX, readY} = config;
  const graphHeight = height - 100;

  const series = container.datum();

  container
    .style('width', px(width))
    .style('height', px(height));

  const svg = container.selectAll('svg')
    .attr('width', width)
    .attr('height', height)

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
    .attr('d', group => calcD(group.data, width, graphHeight, readX, readY))

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

      const chartDotAll = chartDot.merge(chartDotEnter)
        .attr('cx', compose(calcX(data, width, readX), readX))
        .attr('cy', compose(calcY(data, graphHeight, readY), readY));
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
    title: 'Air Temperature',
    color: '#0052b3',
    data: data,
    unit: '°C'
  },
  {
    title: 'Water Temperature',
    color: '#00a5ed',
    data: data2,
    unit: '°C'
  }
];

const container = d3.select('#chart').datum(series);

const config = {
  width: 800,
  height: 600,
  tooltipWidth: 240,
  readX,
  readY
};

enter(container, config);
update(container, config);