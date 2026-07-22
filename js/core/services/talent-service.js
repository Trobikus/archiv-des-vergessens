// ============================================================
// FILE: js/core/services/talent-service.js – Path of Exile Style Talent Service
// ============================================================
import { TALENT_NODES } from '../../data/talent-nodes.js';
import { EVENTS } from '../events/definitions.js';

export class TalentService {
  /**
   * @param {import('../state/manager.js').StateManager} stateManager
   * @param {import('../events/bus.js').default} eventBus
   */
  constructor(stateManager, eventBus) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;

    this._initTalentState();
  }

  _initTalentState() {
    let currentState = this._stateManager.getState();
    if (!currentState) {
      this._stateManager.init();
      currentState = this._stateManager.getState();
    }

    const hero = currentState?.hero || {};

    if (!hero.talents) {
      this._stateManager.dispatch((state) => ({
        ...state,
        hero: {
          ...state.hero,
          talents: {
            points: 3, // Start talent points
            allocatedNodeIds: ['start_0'] // Start node always allocated
          }
        }
      }), 'init_talents');
    }
  }

  /**
   * Get all allocated node IDs
   * @returns {string[]}
   */
  getAllocatedNodeIds() {
    const state = this._stateManager.getState();
    return state?.hero?.talents?.allocatedNodeIds || ['start_0'];
  }

  /**
   * Get available talent points
   * @returns {number}
   */
  getAvailablePoints() {
    const state = this._stateManager.getState();
    return state?.hero?.talents?.points || 0;
  }

  /**
   * Check if a node is currently allocatable (has points AND is adjacent to an allocated node)
   * @param {string} nodeId
   * @returns {boolean}
   */
  isNodeAllocatable(nodeId) {
    const allocated = this.getAllocatedNodeIds();
    if (allocated.includes(nodeId)) return false;

    const points = this.getAvailablePoints();
    const targetNode = TALENT_NODES[nodeId];
    if (!targetNode || points < targetNode.cost) return false;

    // Must connect to at least one currently allocated node
    return targetNode.connections.some(connId => allocated.includes(connId));
  }

  /**
   * Allocate a node
   * @param {string} nodeId
   * @returns {boolean} Success
   */
  allocateNode(nodeId) {
    if (!this.isNodeAllocatable(nodeId)) return false;

    const node = TALENT_NODES[nodeId];
    const currentAllocated = [...this.getAllocatedNodeIds(), nodeId];
    const currentPoints = this.getAvailablePoints() - node.cost;

    this._stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        talents: {
          ...state.hero.talents,
          points: currentPoints,
          allocatedNodeIds: currentAllocated
        }
      }
    }), 'allocate_talent_node');

    if (this._eventBus) {
      this._eventBus.publish(EVENTS.HERO_UPDATED || 'hero:updated', { nodeId, action: 'allocated' });
    }

    return true;
  }

  /**
   * Check if unallocating a node breaks graph connectivity (PoE Graph Integrity Rule)
   * @param {string} nodeId
   * @returns {boolean}
   */
  canUnallocateNode(nodeId) {
    const allocated = this.getAllocatedNodeIds();
    if (!allocated.includes(nodeId) || nodeId === 'start_0') return false;

    const remaining = allocated.filter(id => id !== nodeId);

    // Breadth-First Search (BFS) from 'start_0' to see if all remaining nodes are still reachable
    const visited = new Set(['start_0']);
    const queue = ['start_0'];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentNode = TALENT_NODES[currentId];

      if (!currentNode) continue;

      for (const neighborId of currentNode.connections) {
        if (remaining.includes(neighborId) && !visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    // If every remaining node was visited, graph remains connected!
    return remaining.every(id => visited.has(id));
  }

  /**
   * Unallocate a node
   * @param {string} nodeId
   * @returns {boolean} Success
   */
  unallocateNode(nodeId) {
    if (!this.canUnallocateNode(nodeId)) return false;

    const node = TALENT_NODES[nodeId];
    const allocated = this.getAllocatedNodeIds().filter(id => id !== nodeId);
    const points = this.getAvailablePoints() + node.cost;

    this._stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        talents: {
          ...state.hero.talents,
          points,
          allocatedNodeIds: allocated
        }
      }
    }), 'unallocate_talent_node');

    if (this._eventBus) {
      this._eventBus.publish(EVENTS.HERO_UPDATED || 'hero:updated', { nodeId, action: 'unallocated' });
    }

    return true;
  }

  /**
   * Reset all allocated nodes back to start_0
   */
  resetTalents() {
    const allocated = this.getAllocatedNodeIds();
    let refundedPoints = 0;

    for (const nodeId of allocated) {
      if (nodeId !== 'start_0' && TALENT_NODES[nodeId]) {
        refundedPoints += TALENT_NODES[nodeId].cost;
      }
    }

    this._stateManager.dispatch((state) => ({
      ...state,
      hero: {
        ...state.hero,
        talents: {
          ...state.hero.talents,
          points: this.getAvailablePoints() + refundedPoints,
          allocatedNodeIds: ['start_0']
        }
      }
    }), 'reset_talents');

    if (this._eventBus) {
      this._eventBus.publish(EVENTS.HERO_UPDATED || 'hero:updated', { action: 'reset' });
    }
  }

  /**
   * Compute aggregated stat bonuses from all allocated nodes
   * @returns {Record<string, number>}
   */
  getAggregatedStats() {
    const allocated = this.getAllocatedNodeIds();
    const aggregated = {
      damagePercent: 0,
      critChancePercent: 0,
      critMultiplierPercent: 0,
      mnemeGainPercent: 0,
      attackSpeedPercent: 0,
      maxHpPercent: 0,
      defensePercent: 0,
      cooldownReductionPercent: 0,
      xpGainPercent: 0,
      hpRegenPercent: 0
    };

    for (const id of allocated) {
      const node = TALENT_NODES[id];
      if (node && node.stats) {
        for (const [key, value] of Object.entries(node.stats)) {
          if (aggregated[key] !== undefined) {
            aggregated[key] += value;
          } else {
            aggregated[key] = value;
          }
        }
      }
    }

    return aggregated;
  }
}

export default TalentService;
