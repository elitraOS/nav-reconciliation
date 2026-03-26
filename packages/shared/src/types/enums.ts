export enum Chain {
  Ethereum = 'Ethereum',
  Arbitrum = 'Arbitrum',
  Optimism = 'Optimism',
  Base = 'Base',
  Polygon = 'Polygon',
}

export enum Protocol {
  Aave = 'Aave',
  Compound = 'Compound',
  Uniswap = 'Uniswap',
  Curve = 'Curve',
  Yearn = 'Yearn',
}

export enum NavStep {
  FetchSnapshots = 'FetchSnapshots',
  Normalize = 'Normalize',
  RollForward = 'RollForward',
  Persist = 'Persist',
}
