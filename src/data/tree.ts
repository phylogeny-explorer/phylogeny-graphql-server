import { RESTDataSource } from 'apollo-datasource-rest';

class TreeAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = 'https://api.opentreeoflife.org/v3/';
  }

  async getTree({ id, depth }) {
    const response = await this.post('tree_of_life/subtree', {
      node_id: id,
      format: 'arguson',
      height_limit: depth,
      include_lineage: true,
    });
    return this.nodeReducer(response.arguson);
  }

  async getClade({ id }) {
    const response = await this.post('tree_of_life/node_info', {
      node_id: id,
      include_lineage: true,
    });
    return this.cladeReducer(response);
  }

  async searchClade({ value }) {
    const response = await this.post('tnrs/autocomplete_name', {
      name: value,
      // include_suppressed: true,
    });
    return response.map(result => ({
      id: `ott${result.ott_id}`,
      name: result.unique_name,
    }));
  }

  async mrca({ clade1, clade2 }) {
    const response = await this.post('tree_of_life/mrca', {
      node_ids: [clade1, clade2],
    });
    const taxon = response.mrca.taxon || response.nearest_taxon;
    return {
      id: taxon.ott_id,
      name: taxon.name,
    };
  }

  cladeReducer(clade) {
    const name = clade.taxon
      ? clade.taxon.name
      : clade.descendant_name_list && clade.descendant_name_list.join(' and ');
    return {
      ...clade,
      ...clade.taxon,
      name,
      id: clade.node_id,
      sources: clade.taxon?.tax_sources,
      leaves: clade.num_tips,
      hasChildren: clade.num_tips > 0,
      lineage:
        clade.lineage && clade.lineage.map(node => this.cladeReducer(node)),
      parentId: clade.lineage && clade.lineage[0] && clade.lineage[0].node_id,
      extant: !(clade.flags && clade.flags.includes('extinct')),
    };
  }

  nodeReducer(clade) {
    const name = clade.taxon
      ? clade.taxon.name
      : clade.descendant_name_list && clade.descendant_name_list.join(' and ');
    return {
      id: clade.node_id,
      name,
      attributes: {
        id: clade.node_id,
        hasChildren: clade.num_tips > 0,
        extant: !(clade.flags && clade.flags.includes('extinct')),
        lineage: clade.lineage && clade.lineage.map(node => node.node_id),
      },
      children:
        clade.children && clade.children.map(node => this.nodeReducer(node)),
    };
  }
}

export default TreeAPI;
