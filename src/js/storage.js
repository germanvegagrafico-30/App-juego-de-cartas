/* ==========================================================================
   STORAGE MANAGER — LocalStorage & JSON Export/Import
   ========================================================================== */

const STORAGE_KEY = 'MUNCHKIN_ASSISTANT_SESSION_V1';

export const StorageManager = {
  /**
   * Load state from LocalStorage
   * @returns {Object|null}
   */
  loadSession() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading Munchkin session from LocalStorage:', e);
      return null;
    }
  },

  /**
   * Save state to LocalStorage
   * @param {Object} state 
   */
  saveSession(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving Munchkin session to LocalStorage:', e);
    }
  },

  /**
   * Clear session from LocalStorage
   */
  clearSession() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing Munchkin session:', e);
    }
  },

  /**
   * Export state as downloadable JSON file
   * @param {Object} state 
   */
  exportToFile(state) {
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `munchkin_partida_${timestamp}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Parse imported JSON file
   * @param {File} file 
   * @returns {Promise<Object>}
   */
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (!parsed.players || !Array.isArray(parsed.players)) {
            throw new Error('El archivo importado no contiene una estructura de partida válida.');
          }
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsText(file);
    });
  }
};
