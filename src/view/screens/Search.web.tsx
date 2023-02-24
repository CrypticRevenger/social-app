import React from 'react'
import {
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {ScrollView} from '../com/util/Views'
import {observer} from 'mobx-react-lite'
import {UserAvatar} from '../com/util/UserAvatar'
import {Text} from '../com/util/text/Text'
import {ScreenParams} from '../routes'
import {useStores} from 'state/index'
import {UserAutocompleteViewModel} from 'state/models/user-autocomplete-view'
import {s} from 'lib/styles'
import {MagnifyingGlassIcon} from 'lib/icons'
import {ViewHeader} from '../com/util/ViewHeader'
import {WhoToFollow} from '../com/discover/WhoToFollow'
import {SuggestedPosts} from '../com/discover/SuggestedPosts'
import {ProfileCard} from '../com/profile/ProfileCard'
import {usePalette} from 'lib/hooks/usePalette'
import {useOnMainScroll} from 'lib/hooks/useOnMainScroll'
import {useAnalytics} from 'lib/analytics'

const MENU_HITSLOP = {left: 10, top: 10, right: 30, bottom: 10}
const FIVE_MIN = 5 * 60 * 1e3

export const Search = observer(({navIdx, visible, params}: ScreenParams) => {
  const pal = usePalette('default')
  const store = useStores()
  const {track} = useAnalytics()
  const scrollElRef = React.useRef<ScrollView>(null)
  const onMainScroll = useOnMainScroll(store)
  const textInput = React.useRef<TextInput>(null)
  const [lastRenderTime, setRenderTime] = React.useState<number>(Date.now()) // used to trigger reloads
  const [isInputFocused, setIsInputFocused] = React.useState<boolean>(false)
  const [query, setQuery] = React.useState<string>('')
  const autocompleteView = React.useMemo<UserAutocompleteViewModel>(
    () => new UserAutocompleteViewModel(store),
    [store],
  )
  const {name} = params

  const onSoftReset = () => {
    scrollElRef.current?.scrollTo({x: 0, y: 0})
  }

  React.useEffect(() => {
    const softResetSub = store.onScreenSoftReset(onSoftReset)
    const cleanup = () => {
      softResetSub.remove()
    }

    if (visible) {
      const now = Date.now()
      if (now - lastRenderTime > FIVE_MIN) {
        setRenderTime(Date.now()) // trigger reload of suggestions
      }
      store.shell.setMinimalShellMode(false)
      autocompleteView.setup()
      store.nav.setTitle(navIdx, 'Search')
    }
    return cleanup
  }, [store, visible, name, navIdx, autocompleteView, lastRenderTime])

  const onPressMenu = () => {
    track('ViewHeader:MenuButtonClicked')
    store.shell.setMainMenuOpen(true)
  }

  const onChangeQuery = (text: string) => {
    setQuery(text)
    if (text.length > 0) {
      autocompleteView.setActive(true)
      autocompleteView.setPrefix(text)
    } else {
      autocompleteView.setActive(false)
    }
  }
  const onPressCancelSearch = () => {
    setQuery('')
    autocompleteView.setActive(false)
  }

  return (
    <View style={s.h100pct}>
      <ViewHeader title="Explore" />
      <ScrollView
        ref={scrollElRef}
        testID="searchScrollView"
        style={[pal.view, styles.container]}
        onScroll={onMainScroll}
        scrollEventThrottle={100}>
        <View style={[pal.view, pal.border, styles.header]}>
          <TouchableOpacity
            testID="viewHeaderBackOrMenuBtn"
            onPress={onPressMenu}
            hitSlop={MENU_HITSLOP}
            style={styles.headerMenuBtn}>
            <UserAvatar
              size={30}
              handle={store.me.handle}
              displayName={store.me.displayName}
              avatar={store.me.avatar}
            />
          </TouchableOpacity>
          <View
            style={[
              {backgroundColor: pal.colors.backgroundLight},
              styles.headerSearchContainer,
            ]}>
            <MagnifyingGlassIcon
              style={[pal.icon, styles.headerSearchIcon]}
              size={21}
            />
            <TextInput
              testID="searchTextInput"
              ref={textInput}
              placeholder="Search"
              placeholderTextColor={pal.colors.textLight}
              selectTextOnFocus
              returnKeyType="search"
              value={query}
              style={[pal.text, styles.headerSearchInput]}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onChangeText={onChangeQuery}
            />
          </View>
          {query ? (
            <View style={styles.headerCancelBtn}>
              <TouchableOpacity onPress={onPressCancelSearch}>
                <Text>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : undefined}
        </View>
        {query && autocompleteView.searchRes.length ? (
          <>
            {autocompleteView.searchRes.map(item => (
              <ProfileCard
                key={item.did}
                handle={item.handle}
                displayName={item.displayName}
                avatar={item.avatar}
              />
            ))}
          </>
        ) : query && !autocompleteView.searchRes.length ? (
          <View>
            <Text style={[pal.textLight, styles.searchPrompt]}>
              No results found for {autocompleteView.prefix}
            </Text>
          </View>
        ) : isInputFocused ? (
          <View>
            <Text style={[pal.textLight, styles.searchPrompt]}>
              Search for users on the network
            </Text>
          </View>
        ) : (
          <ScrollView onScroll={Keyboard.dismiss}>
            <WhoToFollow key={`wtf-${lastRenderTime}`} />
            <SuggestedPosts key={`sp-${lastRenderTime}`} />
            <View style={s.footerSpacer} />
          </ScrollView>
        )}
        <View style={s.footerSpacer} />
      </ScrollView>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 4,
    marginBottom: 14,
  },
  headerMenuBtn: {
    width: 40,
    height: 30,
    marginLeft: 6,
  },
  headerSearchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerSearchIcon: {
    marginRight: 6,
    alignSelf: 'center',
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 17,
  },
  headerCancelBtn: {
    width: 60,
    paddingLeft: 10,
  },

  searchPrompt: {
    textAlign: 'center',
    paddingTop: 10,
  },
})