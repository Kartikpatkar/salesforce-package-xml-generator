/**
 * Salesforce Metadata Client
 * Reusable helper to fetch Salesforce metadata using an authenticated session.
 *
 * Dependencies: salesforce-connector.js (same folder)
 *
 * Usage:
 *   import SalesforceMetadata from './utils/salesforce-metadata.js';
 *   const metadata = new SalesforceMetadata();
 *   const describe = await metadata.describeMetadata();
 *   const layouts = await metadata.listMetadata([{ type: 'Layout' }]);
 *   const profiles = await metadata.readMetadata('Profile', ['Admin']);
 */

import SalesforceConnector from './salesforce-connector.js';

class SalesforceMetadata {
  /**
   * @param {object} options
   * @param {string} [options.apiVersion='56.0'] - Salesforce API version to use
   * @param {SalesforceConnector} [options.connector] - Optional shared connector instance
   */
  constructor(options = {}) {
    this.apiVersion = options.apiVersion || '56.0';
    this.connector = options.connector || new SalesforceConnector();
  }

  /**
   * Describe available metadata types.
   * @returns {Promise<object>} describeMetadata result
   */
  async describeMetadata() {
    const org = await this._requireAuth();
    const url = `${org.instanceUrl}/services/Soap/m/${this.apiVersion}`;
    const body = this._soapEnvelope('describeMetadata', `<apiVersion>${this.apiVersion}</apiVersion>`);
    const xml = await this._postSoap(url, org.sessionId, body);
    return this._parseDescribe(xml);
  }

  /**
   * List metadata entries for given queries.
   * @param {Array<{type:string, folder?:string}>} queries - e.g. [{ type: 'Layout' }]
   * @returns {Promise<Array<{fullName:string,type:string}>}> listMetadata result
   */
  async listMetadata(queries = []) {
    if (!Array.isArray(queries) || queries.length === 0) {
      throw new Error('queries array required');
    }
    const org = await this._requireAuth();
    const url = `${org.instanceUrl}/services/Soap/m/${this.apiVersion}`;
    const queryXml = queries.map(q =>
      `<queries>${q.folder ? `<folder>${q.folder}</folder>` : ''}<type>${q.type}</type></queries>`
    ).join('');
    const body = this._soapEnvelope('listMetadata', `<apiVersion>${this.apiVersion}</apiVersion>${queryXml}`);
    const xml = await this._postSoap(url, org.sessionId, body);
    return this._parseList(xml);
  }

  /**
   * Read metadata records by type and fullNames.
   * @param {string} type - Metadata type (e.g., 'Profile')
   * @param {string[]} fullNames - Array of fullNames to retrieve
   * @returns {Promise<object>} readMetadata result (parsed XML -> JS object)
   */
  async readMetadata(type, fullNames = []) {
    if (!type || !Array.isArray(fullNames) || fullNames.length === 0) {
      throw new Error('type and non-empty fullNames array are required');
    }
    const org = await this._requireAuth();
    const url = `${org.instanceUrl}/services/Soap/m/${this.apiVersion}`;
    const namesXml = fullNames.map(n => `<fullNames>${n}</fullNames>`).join('');
    const body = this._soapEnvelope('readMetadata', `<type>${type}</type>${namesXml}`);
    const xml = await this._postSoap(url, org.sessionId, body);
    return this._parseRead(xml);
  }

  // ---------- Internals ----------

  async _requireAuth() {
    const org = await this.connector.checkAuth();
    if (!org.isAuthenticated) throw new Error('Not authenticated to Salesforce');
    return org;
  }

  _soapEnvelope(action, innerXml) {
    return `<?xml version="1.0" encoding="UTF-8"?>
      <env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                    xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
        <env:Header>
          <SessionHeader xmlns="http://soap.sforce.com/2006/04/metadata">
            <sessionId>{SESSION_ID}</sessionId>
          </SessionHeader>
        </env:Header>
        <env:Body>
          <${action} xmlns="http://soap.sforce.com/2006/04/metadata">
            ${innerXml}
          </${action}>
        </env:Body>
      </env:Envelope>`;
  }

  async _postSoap(url, sessionId, body) {
    const payload = body.replace('{SESSION_ID}', sessionId);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'SOAPAction': '""'
      },
      body: payload
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Metadata API error ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.text();
  }

  _parseDescribe(xml) {
    // Minimal parse: return raw XML string to keep module dependency-free
    return { raw: xml };
  }

  _parseList(xml) {
    // Extract <result><fullName> and <type>
    const results = [];
    const regex = /<result>[\s\S]*?<fullName>(.*?)<\/fullName>[\s\S]*?<type>(.*?)<\/type>[\s\S]*?<\/result>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      results.push({ fullName: match[1], type: match[2] });
    }
    return results;
  }

  _parseRead(xml) {
    // Minimal parse: return raw XML string to keep module dependency-free
    return { raw: xml };
  }
}

export default SalesforceMetadata;
