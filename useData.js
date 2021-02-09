import { useState, useEffect } from 'react';
import { csv } from 'd3';

const csvUrl =
  'https://gist.githubusercontent.com/andre6639/c40b02a85c7362bc1237b530f7988ff0/raw/c3da73ab6ba569a97f906c2a559ad2dddc2de050/MissingMigrants-ConciseGlobal-2020-11-04T23-14-14.csv';

const row = (d) => {
  d.coords = d['Location Coordinates']
    .split(',')
    .map((d) => +d)
    .reverse();
  d['Total Dead and Missing'] = +d['Total Dead and Missing'];
  d['Reported Date'] = new Date(d['Reported Date']);
  return d;
};

export const useData = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    csv(csvUrl, row).then(setData);
  }, []);

  return data;
};
