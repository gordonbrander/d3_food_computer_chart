const width = 600;
const height = 300;

const compose = (a, b) => (x) => a(b(x));

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

const enter = (container, {width, height}) => {
  container
    .append('svg')
    .append('g');
  return container;
}

// Renders the chart
const update = (container, series, config) => {
  const {width, height, readX, readY} = config;

  const calcD = group => {
    const {data} = group;

    const line = d3.line()
      .curve(d3.curveBasis)
      .x(compose(calcX(data, width, readX), readX))
      .y(compose(calcY(data, height, readY), readY));

    return line(data);
  }

  const svg = container.select('svg')
    .attr('width', width)
    .attr('height', height)

  const g = svg.select('g')

  g.selectAll('.chart-line')
    .data(series)
      .attr('d', calcD)
    .enter()
      .append('path')
      .attr('class', 'chart-line')
      .style('stroke', group => group.color)
      .attr('d', calcD)
    .exit()
      .remove();

  g.selectAll('.chart-dot')
    .data(group => group.data)
  .enter()
    .append('circle')
    .attr('class', 'chart-dot')
  .exit()
    .remove();


  return svg;
}

const svg = enter(d3.select('#chart'), {
  width: 800,
  height: 300
});

const series = [
  {
    color: 'blue',
    data: data
  },
  {
    color: 'red',
    data: data2
  }
]

update(svg, series, {
  width: 800,
  height: 300,
  readX,
  readY
});