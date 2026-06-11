/**
 * Salesforce Metadata List Helper
 * Lightweight utility to fetch metadata type list and members from an authenticated org.
 * Depends on salesforce-connector.js (same folder).
 *
 * Usage:
 *   import MetadataList from './salesforce-metadata-list.js';
 *   const metaList = new MetadataList();
 *   const types = await metaList.getAvailableTypes();
 *   const members = await metaList.getMembers('CustomObject', ['Account', 'Contact']);
 */

import SalesforceConnector from './salesforce-connector.js';

class MetadataList {
  /**
   * @param {object} options
   * @param {string} [options.apiVersion='56.0']
   * @param {SalesforceConnector} [options.connector]
   */
  constructor(options = {}) {
    this.apiVersion = options.apiVersion || '56.0';
    this.connector = options.connector || new SalesforceConnector();
  }

  /**
   * Get the list of available metadata types (tooling describe).
   * Returns an array of { xmlName, directoryName, inFolder, metaFile, suffix }.
   */
  async getAvailableTypes() {
    const org = await this._requireAuth();
    const url = `${org.instanceUrl}/services/data/v${this.apiVersion}/tooling/sobjects/`; // tooling describe
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${org.sessionId}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch metadata types: ${res.status} ${res.statusText} ${text.slice(0,200)}`);
    }
    const data = await res.json();
    // Normalize response to a simpler shape
    return (data.sobjects || []).map(s => ({
      name: s.name,
      label: s.label,
      keyPrefix: s.keyPrefix,
      custom: s.custom,
      createable: s.createable,
      updateable: s.updateable,
      retrieveable: s.retrieveable,
      searchable: s.searchable,
      triggerable: s.triggerable
    }));
  }

  /**
   * Get members for specific metadata types using Tooling query.
   * @param {string} type - e.g., 'ApexClass', 'ApexTrigger', 'AuraDefinitionBundle'
   * @param {string[]} [names] - optional filter for names; if empty, returns all
   * @returns {Promise<Array<{name:string,id:string,namespacePrefix?:string,lastModifiedDate?:string}>>}
   */
  async getMembers(type, names = []) {
    if (!type) throw new Error('type is required');
    const org = await this._requireAuth();

    // Special-case: Reports are not available via Tooling API
    if (type === 'Report') {
      return this._getReportMembers(org, names);
    }

    // Map some friendly type aliases to Tooling sObjects
    const toolingObject = this._mapTypeToTooling(type);
    if (!toolingObject) throw new Error(`Unsupported type: ${type}`);

    let soql = `SELECT Id, Name, NamespacePrefix, LastModifiedDate FROM ${toolingObject}`;
    if (names && names.length > 0) {
      const esc = names.map(n => `'${n.replace(/'/g, "\\'")}'`).join(',');
      soql += ` WHERE Name IN (${esc})`;
    }

    const url = `${org.instanceUrl}/services/data/v${this.apiVersion}/tooling/query?q=${encodeURIComponent(soql)}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${org.sessionId}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch members: ${res.status} ${res.statusText} ${text.slice(0,200)}`);
    }
    const data = await res.json();
    return (data.records || []).map(r => ({
      id: r.Id,
      name: r.Name,
      namespacePrefix: r.NamespacePrefix,
      lastModifiedDate: r.LastModifiedDate
    }));
  }

  // ---------- internals ----------

  async _requireAuth() {
    const org = await this.connector.checkAuth();
    if (!org.isAuthenticated) throw new Error('Not authenticated to Salesforce');
    return org;
  }

  _mapTypeToTooling(type) {
    // Extend this map as needed
    const map = {
      'ApexClass': 'ApexClass',
      'ApexTrigger': 'ApexTrigger',
      'ApexPage': 'ApexPage',
      'ApexComponent': 'ApexComponent',
      'AuraDefinitionBundle': 'AuraDefinitionBundle',
      'LightningComponentBundle': 'LightningComponentBundle',
      'CustomObject': 'CustomObject',
      'CustomField': 'CustomField',
      'Profile': 'Profile',
      'PermissionSet': 'PermissionSet'
    };
    return map[type] || null;
  }

  async _getReportMembers(org, names = []) {
    let soql = 'SELECT Id, DeveloperName, NamespacePrefix, LastModifiedDate FROM Report';
    if (names && names.length > 0) {
      const esc = names.map(n => `'${n.replace(/'/g, "\\'")}'`).join(',');
      soql += ` WHERE DeveloperName IN (${esc})`;
    }

    const url = `${org.instanceUrl}/services/data/v${this.apiVersion}/query?q=${encodeURIComponent(soql)}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${org.sessionId}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch report members: ${res.status} ${res.statusText} ${text.slice(0,200)}`);
    }

    const data = await res.json();
    return (data.records || []).map(r => ({
      id: r.Id,
      name: r.DeveloperName || r.Name,
      namespacePrefix: r.NamespacePrefix,
      lastModifiedDate: r.LastModifiedDate
    }));
  }
}

export default MetadataList;
