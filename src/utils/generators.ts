const rombusGenerator = function* (size: number) {
  const half = size / 2;
  for (let x = -half; x <= half; x++) {
    for (let z = -half; z <= half; z++) {
      yield [x, 0, z];
    }
  }
};

export { rombusGenerator }; 
