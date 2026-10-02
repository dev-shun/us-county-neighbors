export interface County {
  /** 5-digit, zero-padded FIPS code, e.g. "01001". */
  readonly fips: string;
  /** e.g. "Doña Ana" */
  readonly name: string;
  /** ASCII form of the name, e.g. "Dona Ana" */
  readonly nameAscii: string;
  /** e.g. "Cook County", "Orleans Parish", "Baltimore City" */
  readonly fullName: string;
  /** 2-letter code, e.g. "IL" */
  readonly stateCode: string;
  /** e.g. "Illinois" */
  readonly stateName: string;
  readonly lat: number;
  readonly lng: number;
  readonly population: number;
}

export interface CountyWithNeighbors extends County {
  readonly neighbors: County[];
}

export interface State {
  readonly code: string;
  readonly name: string;
}

export interface NeighborOptions {
  /** Attach each county's direct neighbors as `neighbors`. */
  includeNeighbors?: boolean;
}

export interface SearchOptions extends NeighborOptions {
  /** Restrict results to one state: a 2-letter code ("IL") or full name ("Illinois"). */
  state?: string;
}

/** Shape of the generated data files: counties sorted by FIPS, neighbor FIPS lists keyed by FIPS. */
export interface Dataset {
  counties: County[];
  neighbors: Record<string, string[]>;
}
