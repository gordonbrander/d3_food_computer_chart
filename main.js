const width = 600;
const height = 300;

const compose = (a, b) => (x) => a(b(x));

const px = n => n + 'px';

const readX = d => d.x;
const readY = d => d.y;

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

const calcTooltipX = (x, width, tooltipWidth) =>
  (x + (tooltipWidth / 2)) > width ?
  (width - (tooltipWidth / 2)) :
  (x - (tooltipWidth / 2)) < 0 ?
  (tooltipWidth / 2) :
  x;

const enter = (container, {width, tooltipWidth}) => {
  const xhair = container.append('div')
    .classed('chart-xhair', true);

  const tooltip = container.append('div')
    .classed('chart-tooltip', true)
    .style('width', px(tooltipWidth))
    .style('margin-left', px(-1 * (tooltipWidth / 2)));

  container.append('svg');

  container
    .classed('chart', true)
    .on('mousemove', function (d) {
      const x = d3.event.clientX - this.offsetLeft;
      const tx = calcTooltipX(x, width, tooltipWidth)

      xhair.style('left', px(x));
      tooltip.style('left', px(tx));
    });

  return container;
}

// Renders the chart
const update = (container, series, config) => {
  const {width, height, readX, readY} = config;
  const graphHeight = height - 100;

  const calcD = group => {
    const {data} = group;

    const line = d3.line()
      .curve(d3.curveBasis)
      .x(compose(calcX(data, width, readX), readX))
      .y(compose(calcY(data, graphHeight, readY), readY));

    return line(data);
  }

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
      .classed('chart-group', true)

  groupEnter
    .append('path')
      .classed('chart-line', true)
      .style('stroke', group => group.color);

  const groupAll = group.merge(groupEnter);

  groupAll.select('.chart-line')
    .attr('d', calcD);

  // Add chart dots
  groupAll.selectAll('.chart-dot')
    // Filter down to data
    .data(group => group.data)
  .enter()
    .append('circle')
    .attr('class', 'chart-dot')
    .attr('cx', compose(calcX(data, width, readX), readX))
    .attr('cy', compose(calcY(data, graphHeight, readY), readY))
    .attr("r", 2.5)
  .exit()
    .remove();

  const readout = d3.select('.chart-tooltip').selectAll('.chart-tooltip--readout')
    .data(series)

  const readoutEnter = readout.enter()
    .append('div')
    .classed('chart-tooltip--readout', true)
    .on('mousemove', function (d) {
      // @TODO hmmm
      const x = compose(calcX(data, width, readX), readX);
      this.text(x(d));
    });

  return svg;
}

const svg = enter(d3.select('#chart'), {width: 800, tooltipWidth: 240});

const series = [
  {
    color: '#0052b3',
    data: data
  },
  {
    color: '#00a5ed',
    data: data2
  }
]

update(svg, series, {
  width: 800,
  height: 600,
  readX,
  readY
});