import Vue from 'vue'
import Vuex from 'vuex'
import config from './config'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    page: config.ALL_PAGE_NAME,
    collections: [],
    getCollection: function(name) {
      const collectionNames = this.collections.map((c) => c.name)
      const index = collectionNames.indexOf(name)
      if (index === -1) {
        console.error(
          'Collection',
          name,
          'was not found, make sure it is specified in the props.'
        )
      }
      return this.collections[index]
    },
    getEntry: function(type, id) {
      const entry = this.globalstore().getters['jv/get'](type)[id]
      if (entry === undefined) {
        console.log('GETTING', type + '/' + id)
        setTimeout(() => {
          this.globalstore().dispatch('jv/get', type + '/' + id)
        }, 0)
      }
      return entry
    },
    search: '',
    expandedAdvancedSearch: false,
    sldProp: {},
    globalstore: () => {},
    pendingRequests: 0,
    searchTimeout: null,
  },
  mutations: {
    setPage(state, page) {
      Vue.set(state, 'page', page)
    },
    updateSearchResults(state) {

      const fetchEntries = () => {
        // for each collection, filter the results from the store and put them into
        // the .searchResults attribute
        state.collections.forEach((collection) => {
          if (collection.options.show === false) return
  
          // do a quick filter in case no columns are ticked
          const results = collection.filter(state.search)
          Vue.set(collection, 'searchResults', state.search ? results : {})
  
          if (state.search === '') return
  
          collection.options.columns.forEach((column) => {
            fetchEntry(collection, column)
          })
        })
      }

      const fetchEntry = (collection, column) => {
        if (!column.searchable) return

        state.pendingRequests++
        // prettier-ignore
        state.globalstore().dispatch(
          'jv/get',
          [
            collection.name,
            {
              params: {
                [`filter[${column.name}:ilike]`]: '*' + state.search + '*',
              },
            },
          ]
        ).then((data) => {
          const results = collection.filter(state.search)
          Vue.set(collection, 'searchResults', state.search ? results : {})

          state.pendingRequests--
          // if this is the last request to finish
          if (state.pendingRequests === 0) {
            fetchRelationships(data)
          }
        })
      }

      const fetchRelationships = (lastEntry) => {
        // fetch relationships for all columns
        state.collections.forEach((collection) => {
          if (collection.options.show === false) return

          const anyEntry = collection.searchResults[Object.keys(lastEntry)[0]]
          const relationships = Object.keys(anyEntry._jv.relationships)
          console.log('last request!', relationships)
          collection.options.columns.forEach((column) => {
            fetchRelationship(collection, column, relationships)
          })
        })
      }

      const fetchRelationship = (collection, column, relationships) => {
        state.pendingRequests++
        state.globalstore().dispatch(
          'jv/get',
          [
            collection.name,
            {
              params: {
                [`filter[${column.name}:ilike]`]: '*' + state.search + '*',
                include: relationships.join(','),
              },
            },
          ]
        ).then(() => {
          state.pendingRequests--
          const results = collection.filter(state.search)
          Vue.set(collection, 'searchResults', state.search ? results : {})
        })
      }

      fetchEntries()
    },
  },
  actions: {
    updateSearchResults(context) {
      // console.debug('updating search results')
      context.commit('updateSearchResults')
    },
    setPage(context, page) {
      // console.debug('setting page', page)
      context.commit('setPage', null)
      context.state.nextTick(() => {
        context.commit('setPage', page)
      })
    },
    refreshPage(context) {
      context.dispatch('setPage', this.page)
    },
  },
})
