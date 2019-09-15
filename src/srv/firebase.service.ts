import { Progress } from '@/decorators/progress.decorator'
import { analyticsService } from '@/srv/analytics.service'
import { BackendResponse, releasesService } from '@/srv/releases.service'
import { sentryService } from '@/srv/sentry.service'
import { extendState } from '@/store'
import { urlUtil } from '@/util/url.util'
import { _pick, deepCopy, memo } from '@naturalcycles/js-lib'
import { pDefer } from '@naturalcycles/js-lib'
import * as firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/performance'

export interface UserInfo {
  uid: string
  displayName: string
  email: string
  photoURL: string
  idToken: string
}

// const CONFIG = {
//   apiKey: 'AIzaSyC_ooKU2uYbczwRQVfAa6VjGbxfkV-9cYI',
//   authDomain: 'test124-1621f.firebaseapp.com',
//   projectId: 'test124-1621f',
//   appId: '1:755695435449:web:734140edc18237cc',
// }

const CONFIG = {
  apiKey: 'AIzaSyDcl9-AomhZQh2DWUswioVYQ3AsUhPb2bc',
  authDomain: 'kg-backend3.firebaseapp.com',
  projectId: 'kg-backend3',
  appId: '1:1005385763504:web:6086ebd57284a3d3',
}

const USER_FIELDS: (keyof UserInfo)[] = ['uid', 'displayName', 'email', 'photoURL']

const githubAuthProvider = new firebase.auth.GithubAuthProvider()

class FirebaseService {
  private authStateChangedDeferred = pDefer()
  authStateChanged = this.authStateChangedDeferred.promise

  @memo()
  async init (): Promise<void> {
    firebase.initializeApp(CONFIG)
    firebase.auth().onAuthStateChanged(user => this.onAuthStateChanged(user as any))

    if (window.prod) {
      firebase.performance()
    }
  }

  async login (): Promise<BackendResponse> {
    const r = (await firebase.auth().signInWithPopup(githubAuthProvider)) as any
    // const r = await firebase.auth!().signInWithRedirect(githubAuthProvider)
    console.log(r)
    const idToken = await firebase.auth().currentUser!.getIdToken()
    // console.log('idToken', idToken)

    const br = await releasesService.auth({
      username: r.additionalUserInfo!.username,
      accessToken: r.credential!.accessToken,
      idToken,
    })

    return br
  }

  @Progress()
  async logout (): Promise<void> {
    await firebase.auth().signOut()
    sentryService.setUserContext({})
  }

  private async onAuthStateChanged (_user?: UserInfo): Promise<void> {
    console.log('onAuthStateChanged, user: ', deepCopy(_user))

    // debug!
    const qs = urlUtil.qs()
    if (qs.uid) {
      console.log('debug: ?uid')
      const user = {
        uid: qs.uid,
      } as UserInfo

      sentryService.setUserContext(user)
      analyticsService.setUserId(user.uid)

      extendState({
        user,
      })
    } else if (_user) {
      const idToken = await firebase.auth!().currentUser!.getIdToken()

      // console.log('idToken', idToken)
      const user = {
        ..._pick(_user, USER_FIELDS),
        idToken,
      }

      sentryService.setUserContext(user)
      analyticsService.setUserId(user.uid)

      extendState({
        user,
      })
    } else {
      extendState({
        user: {} as any,
        userFM: { settings: {} } as any,
      })
    }

    this.authStateChangedDeferred.resolve()
  }
}

export const firebaseService = new FirebaseService()
