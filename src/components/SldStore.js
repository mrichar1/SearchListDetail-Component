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
      return this.collections[collectionNames.indexOf(name)]
    },
    search: '',
    expandedAdvancedSearch: false,
    sldProp: {},
    globalstore: {},
    pendingRequests: 0,
  },
  mutations: {
    setPage(state, page) {
      Vue.set(state, 'page', page)
    },
    updateSearchResults(state) {
      // for each collection, filter the results from the store and put them into
      // the .searchResults attribute
      state.collections.forEach((collection) => {
        // do a quick filter in case no columns are ticked
        const results = collection.filter(state.search)
        Vue.set(collection, 'searchResults', state.search ? results : {})

        collection.options.columns.forEach((column) => {
          if (!column.searchable) return

          const filter = `filter[${column.name}:ilike]`
          const action = [
            collection.name,
            {
              params: {
                [filter]: '*' + state.search + '*',
              },
            },
          ]
          state.pendingRequests++
          state.globalstore.dispatch('jv/get', action).then(() => {
            state.pendingRequests--
            const results = collection.filter(state.search)
            Vue.set(collection, 'searchResults', state.search ? results : {})
          })
        })
        // collection.columnNames.forEach((column) => {
        // })
      })
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
  },
})
