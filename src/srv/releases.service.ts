import { Progress } from '@/decorators/decorators'
import { api } from '@/srv/api.service'
import { store } from '@/store'
import { _Memo } from '@naturalcycles/js-lib'
import { AuthInput, BackendResponse, Release, Repo, UserSettings } from './model'

class ReleasesService {
  // @Progress()
  async fetchReleases(minIncl: string, maxExcl = ''): Promise<BackendResponse> {
    // console.log(`fetchReleases [${minIncl}; ${maxExcl})`)

    const { releases } = await api
      .get('', {
        searchParams: {
          minIncl,
          maxExcl,
        },
      })
      .json<BackendResponse>()

    store.commit('addReleases', releases)

    return {
      releases,
    }
  }

  @Progress()
  async fetchRepos(): Promise<void> {
    const starredRepos = await api.get('repos').json<Repo[]>()

    store.commit('extendState', {
      starredRepos,
    })
  }

  @Progress()
  async getReleasesByRepo(repoFullName: string): Promise<Release[]> {
    return await api.get(`repos/${repoFullName}/releases`).json<Release[]>()
  }

  @Progress()
  async fetchReleasesByRepo(repoFullName: string): Promise<Release[]> {
    return await api.get(`repos/${repoFullName}/releases/fetch`).json<Release[]>()
  }

  @Progress()
  async auth(json: AuthInput): Promise<BackendResponse> {
    const br = await api
      .post(`auth`, {
        json,
      })
      .json<BackendResponse>()
    // console.log('auth', br)

    store.commit('onBackendResponse', br)

    return br
  }

  async saveUserSettings(json: UserSettings): Promise<BackendResponse> {
    const br = await api
      .put(`userSettings`, {
        json,
      })
      .json<BackendResponse>()

    store.commit('onBackendResponse', br)

    return br
  }

  @_Memo()
  async init(): Promise<BackendResponse> {
    const br = await api.get(`init`).json<BackendResponse>()

    store.commit('onBackendResponse', br)

    return br
  }
}

export const releasesService = new ReleasesService()
