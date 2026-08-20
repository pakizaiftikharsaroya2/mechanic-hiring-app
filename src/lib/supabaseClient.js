import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isMockMode = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('YOUR_PROJECT_REF') || 
  supabaseAnonKey.includes('your-anon');

// Shared listeners for mock realtime updates
const channelListeners = new Set();

class MockQueryBuilder {
  constructor(table) {
    this.table = table;
    this._filters = [];
    this._order = null;
    this._insertData = null;
    this._updateData = null;
    this._isSingle = false;
  }

  select(cols) {
    return this;
  }

  insert(data) {
    this._insertData = data;
    return this;
  }

  update(data) {
    this._updateData = data;
    return this;
  }

  eq(col, val) {
    this._filters.push({ col, val, op: 'eq' });
    return this;
  }

  in(col, vals) {
    this._filters.push({ col, vals, op: 'in' });
    return this;
  }

  is(col, val) {
    this._filters.push({ col, val, op: 'is' });
    return this;
  }

  order(col, { ascending = true } = {}) {
    this._order = { col, ascending };
    return this;
  }

  single() {
    this._isSingle = true;
    return this;
  }

  maybeSingle() {
    this._isSingle = true;
    return this;
  }

  async then(onFulfilled, onRejected) {
    try {
      let db = [];
      if (this.table === 'profiles') db = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
      else if (this.table === 'mechanic_profiles') db = JSON.parse(localStorage.getItem('mock_mechanic_profiles') || '[]');
      else if (this.table === 'service_requests') db = JSON.parse(localStorage.getItem('mock_service_requests') || '[]');
      else if (this.table === 'messages') db = JSON.parse(localStorage.getItem('mock_messages') || '[]');
      else if (this.table === 'mechanic_locations') db = JSON.parse(localStorage.getItem('mock_locations') || '[]');

      // Apply filters
      let data = [...db];
      this._filters.forEach(f => {
        if (f.op === 'eq') {
          data = data.filter(row => {
            if (row[f.col] === f.val) return true;
            if (typeof row[f.col] === 'string' && typeof f.val === 'string') {
              return row[f.col].toUpperCase() === f.val.toUpperCase();
            }
            if (f.col === 'status' && (f.val === 'PENDING' || f.val === 'pending')) {
              return !row.status || String(row.status).toUpperCase() === 'PENDING';
            }
            return false;
          });
        } else if (f.op === 'in') {
          const upperVals = f.vals.map(v => typeof v === 'string' ? v.toUpperCase() : v);
          data = data.filter(row => {
            const val = typeof row[f.col] === 'string' ? row[f.col].toUpperCase() : row[f.col];
            return upperVals.includes(val);
          });
        } else if (f.op === 'is') {
          data = data.filter(row => row[f.col] === f.val);
        }
      });

      let resultData = data;

      // Handle Insert
      if (this._insertData) {
        const rowsToInsert = Array.isArray(this._insertData) ? this._insertData : [this._insertData];
        const newRows = rowsToInsert.map(row => ({
          id: row.id || `row_${Date.now()}_${Math.random()}`,
          created_at: new Date().toISOString(),
          ...row
        }));
        db.push(...newRows);
        localStorage.setItem(`mock_${this.table}`, JSON.stringify(db));

        // Trigger mock realtime channel listeners
        setTimeout(() => {
          channelListeners.forEach(listener => {
            if (listener.table === this.table && listener.event === 'INSERT') {
              listener.callback({ new: newRows[0] });
            }
          });
        }, 100);

        resultData = Array.isArray(this._insertData) ? newRows : newRows[0];
      }
      // Handle Update
      else if (this._updateData) {
        const updatedRowsList = [];
        db = db.map(row => {
          let matches = true;
          this._filters.forEach(f => {
            if (row[f.col] !== f.val) matches = false;
          });
          if (matches) {
            const updatedRow = { ...row, ...this._updateData, updated_at: new Date().toISOString() };
            updatedRowsList.push(updatedRow);

            // Trigger mock realtime channel updates
            setTimeout(() => {
              channelListeners.forEach(listener => {
                if (listener.table === this.table && (listener.event === 'UPDATE' || listener.event === '*')) {
                  listener.callback({ new: updatedRow, old: row });
                }
              });
            }, 100);

            return updatedRow;
          }
          return row;
        });
        localStorage.setItem(`mock_${this.table}`, JSON.stringify(db));
        resultData = this._isSingle ? (updatedRowsList[0] || null) : updatedRowsList;
      }
      // Handle Queries
      else {
        if (this._order) {
          const { col, ascending } = this._order;
          resultData.sort((a, b) => {
            if (a[col] < b[col]) return ascending ? -1 : 1;
            if (a[col] > b[col]) return ascending ? 1 : -1;
            return 0;
          });
        }
        if (this._isSingle) {
          resultData = resultData.length > 0 ? resultData[0] : null;
        }
      }

      const response = { data: resultData, error: null };
      return onFulfilled ? onFulfilled(response) : response;
    } catch (err) {
      const response = { data: null, error: err };
      return onRejected ? onRejected(response) : response;
    }
  }
}

class MockSupabaseClient {
  constructor() {
    // Seed initial mock database if empty
    if (!localStorage.getItem('mock_profiles')) {
      const initialProfiles = [
        {
          id: 'usr_sarah',
          name: 'Sarah Miller',
          email: 'sarah@autorescue.pk',
          phone: '0300-1112223',
          role: 'MECHANIC',
          avatar: '/mechanic_female.png',
          created_at: new Date().toISOString()
        },
        {
          id: 'usr_marcus',
          name: 'Marcus Wrench',
          email: 'marcus@autorescue.pk',
          phone: '0321-4445556',
          role: 'MECHANIC',
          avatar: '/mechanic_male.png',
          created_at: new Date().toISOString()
        },
        {
          id: 'usr_client1',
          name: 'Zainab Ahmed',
          email: 'client@autorescue.pk',
          phone: '0333-7778889',
          role: 'CLIENT',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('mock_profiles', JSON.stringify(initialProfiles));
    }

    if (!localStorage.getItem('mock_mechanic_profiles')) {
      const initialMechProfiles = [
        {
          user_id: 'usr_sarah',
          specialty: 'Diagnostics',
          rating: '4.9',
          total_jobs: 24,
          status: 'ONLINE',
          latitude: 31.5204, // Lahore Mall Road
          longitude: 74.3587,
          is_verified: true
        },
        {
          user_id: 'usr_marcus',
          specialty: 'Tire Expert',
          rating: '4.8',
          total_jobs: 42,
          status: 'ONLINE',
          latitude: 31.4704, // Lahore Gulberg
          longitude: 74.3487,
          is_verified: true
        }
      ];
      localStorage.setItem('mock_mechanic_profiles', JSON.stringify(initialMechProfiles));
    }

    if (!localStorage.getItem('mock_service_requests')) {
      const initialRequests = [
        {
          id: 'req_demo1',
          client_id: 'usr_client1',
          vehicle_make: 'Toyota',
          vehicle_model: 'Corolla Altis',
          vehicle_color: 'Silver',
          breakdown_type: 'Flat Tire',
          service_type: 'Tire Change',
          description: 'Flat tire near Liberty Roundabout. Have a spare but no jack.',
          latitude: 31.5104,
          longitude: 74.3487,
          location_text: 'Liberty Roundabout, Gulberg, Lahore',
          budget: 2500,
          payment_method: 'JazzCash',
          status: 'PENDING',
          created_at: new Date(Date.now() - 360000).toISOString(),
          updated_at: new Date(Date.now() - 360000).toISOString()
        }
      ];
      localStorage.setItem('mock_service_requests', JSON.stringify(initialRequests));
    }

    if (!localStorage.getItem('mock_users')) {
      // Seed default accounts so users can log in immediately with:
      // client@autorescue.pk / client123
      // mechanic@autorescue.pk / mechanic123
      const initialUsers = [
        {
          id: 'usr_client1',
          email: 'client@autorescue.pk',
          password: 'client123',
          user_metadata: { name: 'Zainab Ahmed', role: 'CLIENT', phone: '0333-7778889' }
        },
        {
          id: 'usr_sarah',
          email: 'mechanic@autorescue.pk',
          password: 'mechanic123',
          user_metadata: { name: 'Sarah Miller', role: 'MECHANIC', phone: '0300-1112223' }
        }
      ];
      localStorage.setItem('mock_users', JSON.stringify(initialUsers));
    }

    this.auth = {
      signUp: async ({ email, password, options }) => {
        const name = options?.data?.name || email.split('@')[0];
        const role = options?.data?.role || 'CLIENT';
        const phone = options?.data?.phone || '';
        
        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        if (users.some(u => u.email === email)) {
          throw new Error('User already exists');
        }

        const newUser = {
          id: `usr_${Date.now()}`,
          email,
          user_metadata: { name, role, phone }
        };
        
        users.push({ ...newUser, password });
        localStorage.setItem('mock_users', JSON.stringify(users));

        const profile = {
          id: newUser.id,
          name,
          email,
          phone,
          role,
          avatar: role === 'MECHANIC' ? '/mechanic_female.png' : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80',
          created_at: new Date().toISOString()
        };
        const profiles = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
        profiles.push(profile);
        localStorage.setItem('mock_profiles', JSON.stringify(profiles));

        // If mechanic, initialize mechanic_profile
        if (role === 'MECHANIC') {
          const mechProfiles = JSON.parse(localStorage.getItem('mock_mechanic_profiles') || '[]');
          mechProfiles.push({
            user_id: newUser.id,
            specialty: options?.data?.specialty || 'General Mechanic',
            rating: '5.0',
            total_jobs: 0,
            status: 'OFFLINE',
            latitude: 31.5204, // Default Lahore latitude
            longitude: 74.3587,
            is_verified: false, // Default to unverified until checked
            cnic_number: options?.data?.cnicNumber || '',
            cnic_front: options?.data?.cnicFront || null,
            cnic_back: options?.data?.cnicBack || null,
            selfie: options?.data?.selfie || null
          });
          localStorage.setItem('mock_mechanic_profiles', JSON.stringify(mechProfiles));
        }

        const session = { user: newUser, access_token: 'mock-token' };
        localStorage.setItem('mock_session', JSON.stringify(session));
        this._triggerAuthChange(session);
        return { data: { user: newUser, session }, error: null };
      },

      signInWithOAuth: async ({ provider }) => {
        const newUser = {
          id: `usr_google_${Date.now()}`,
          email: 'google.user@gmail.com',
          user_metadata: { name: 'Google Client User', role: 'CLIENT', phone: '0300-9998887' }
        };
        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        if (!users.some(u => u.email === newUser.email)) {
          users.push({ ...newUser, password: 'googleuser123' });
          localStorage.setItem('mock_users', JSON.stringify(users));

          const profiles = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
          profiles.push({
            id: newUser.id,
            name: newUser.user_metadata.name,
            email: newUser.email,
            phone: newUser.user_metadata.phone,
            role: 'CLIENT',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80',
            created_at: new Date().toISOString()
          });
          localStorage.setItem('mock_profiles', JSON.stringify(profiles));
        } else {
          const existing = users.find(u => u.email === newUser.email);
          newUser.id = existing.id;
          newUser.user_metadata.name = existing.user_metadata.name;
        }

        const session = { user: newUser, access_token: 'google-mock-token' };
        localStorage.setItem('mock_session', JSON.stringify(session));
        this._triggerAuthChange(session);
        return { data: { user: newUser, session }, error: null };
      },

      signUpWithPhone: async (phone) => {
        const email = `phone-${phone.replace(/\D/g, '')}@autorescue.pk`;
        const newUser = {
          id: `usr_phone_${Date.now()}`,
          email,
          user_metadata: { name: 'Emergency Client', role: 'CLIENT', phone }
        };
        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        if (!users.some(u => u.user_metadata?.phone === phone)) {
          users.push({ ...newUser, password: 'phoneuser123' });
          localStorage.setItem('mock_users', JSON.stringify(users));

          const profiles = JSON.parse(localStorage.getItem('mock_profiles') || '[]');
          profiles.push({
            id: newUser.id,
            name: newUser.user_metadata.name,
            email: newUser.email,
            phone: newUser.user_metadata.phone,
            role: 'CLIENT',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80',
            created_at: new Date().toISOString()
          });
          localStorage.setItem('mock_profiles', JSON.stringify(profiles));
        } else {
          const existing = users.find(u => u.user_metadata?.phone === phone);
          newUser.id = existing.id;
          newUser.email = existing.email;
          newUser.user_metadata.name = existing.user_metadata.name;
        }

        const session = { user: newUser, access_token: 'phone-mock-token' };
        localStorage.setItem('mock_session', JSON.stringify(session));
        this._triggerAuthChange(session);
        return { data: { user: newUser, session }, error: null };
      },

      signInWithPassword: async ({ email, password }) => {
        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const found = users.find(u => u.email === email && u.password === password);
        if (!found) {
          throw new Error('Invalid email or password');
        }

        const session = { 
          user: { id: found.id, email: found.email, user_metadata: found.user_metadata },
          access_token: 'mock-token'
        };
        localStorage.setItem('mock_session', JSON.stringify(session));
        this._triggerAuthChange(session);
        return { data: { user: session.user, session }, error: null };
      },

      signOut: async () => {
        localStorage.removeItem('mock_session');
        this._triggerAuthChange(null);
        return { error: null };
      },

      getSession: async () => {
        const saved = localStorage.getItem('mock_session');
        return { data: { session: saved ? JSON.parse(saved) : null }, error: null };
      },

      onAuthStateChange: (callback) => {
        this.authCallbacks.add(callback);
        const saved = localStorage.getItem('mock_session');
        callback('SIGNED_IN', saved ? JSON.parse(saved) : null);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                this.authCallbacks.delete(callback);
              }
            }
          }
        };
      }
    };
    
    this.authCallbacks = new Set();
  }

  _triggerAuthChange(session) {
    this.authCallbacks.forEach(cb => cb(session ? 'SIGNED_IN' : 'SIGNED_OUT', session));
  }

  from(table) {
    return new MockQueryBuilder(table);
  }

  channel(name) {
    return {
      on(type, filter, callback) {
        const table = filter.table;
        const event = filter.event;
        channelListeners.add({ name, table, event, callback });
        return this;
      },
      subscribe(callback) {
        if (callback) callback('SUBSCRIBED');
        return this;
      }
    };
  }

  removeChannel(chan) {
    return Promise.resolve();
  }
}

let supabaseClient;

if (isMockMode) {
  console.warn(
    'AutoRescue is running in localized simulated Demo Mode (local mock database). ' +
    'Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY inside .env.local to link up a live Supabase DB.'
  );
  supabaseClient = new MockSupabaseClient();
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = supabaseClient;
export const isMock = isMockMode;
