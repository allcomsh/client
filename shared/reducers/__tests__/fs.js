// @flow
/* eslint-env jest */
import * as Types from '../../constants/types/fs'
import * as Constants from '../../constants/fs'
import * as FsGen from '../../actions/fs-gen'
import * as I from 'immutable'
import reducer from '../fs'

jest.unmock('immutable')

const kbkbfstestPath = Types.stringToPath('/keybase/team/kbkbfstest')
const file0Path = Types.pathConcat(kbkbfstestPath, 'file0')
const folder0Path = Types.pathConcat(kbkbfstestPath, 'folder0')

const getFolderOrFail = (pathItems, path): Types.FolderPathItem => {
  const pathItem = pathItems.get(path)
  expect(pathItem).toBeTruthy()
  expect(pathItem ? pathItem.type : 'nope').toBe('folder')
  return pathItem && pathItem.type === 'folder' ? pathItem : Constants.makeFolder()
}

const state0 = Constants.makeState({
  pathItems: I.Map([
    [
      kbkbfstestPath,
      Constants.makeFolder({
        children: I.Set(['file0', 'folder0']),
        name: 'kbkbfstest',
        prefetchStatus: Constants.makePrefetchInProgress(),
        progress: 'loaded',
      }),
    ],
    [
      file0Path,
      Constants.makeFile({
        lastModifiedTimestamp: 1,
        lastWriter: 'foo',
        mimeType: Constants.makeMime({
          displayPreview: true,
          mimeType: 'text/plain',
        }),
        name: 'file0',
      }),
    ],
    [
      folder0Path,
      Constants.makeFolder({
        children: I.Set(),
        name: 'folder0',
        progress: 'pending',
      }),
    ],
  ]),
})

describe('fs reducer', () => {
  test('pathItemLoaded: reuse old pathItem even if new one lacks mimeType', () => {
    const state1 = reducer(
      state0,
      FsGen.createPathItemLoaded({
        path: file0Path,
        pathItem: Constants.makeFile({
          lastModifiedTimestamp: 1,
          lastWriter: 'foo',
          name: 'file0',
        }),
      })
    )
    expect(state1.pathItems).toBe(state0.pathItems)
  })

  test('pathItemLoaded: reuse old pathItem if new one remains the same', () => {
    const state1 = reducer(
      state0,
      FsGen.createPathItemLoaded({
        path: file0Path,
        pathItem: Constants.makeFile({
          lastModifiedTimestamp: 1,
          lastWriter: 'foo',
          mimeType: Constants.makeMime({
            displayPreview: true,
            mimeType: 'text/plain',
          }),
          name: 'file0',
        }),
      })
    )
    expect(state1.pathItems).toBe(state0.pathItems)
  })

  test('pathItemLoaded: unset mimeType when other metadata changes', () => {
    const newPathItem = Constants.makeFile({
      lastModifiedTimestamp: 2,
      lastWriter: 'foo',
      name: 'file0',
      size: 1,
    })
    const state1 = reducer(
      state0,
      FsGen.createPathItemLoaded({
        path: file0Path,
        pathItem: newPathItem,
      })
    )
    expect(state1.pathItems).not.toBe(state0.pathItems)
    expect(state1.pathItems.get(file0Path)).toBe(newPathItem)
  })

  test('pathItemLoaded: pending folder should not over ride loaded children', () => {
    const state1 = reducer(
      state0,
      FsGen.createPathItemLoaded({
        path: kbkbfstestPath,
        pathItem: Constants.makeFolder({
          lastModifiedTimestamp: 1,
          name: 'kbkbfstest',
        }),
      })
    )
    expect(state1.pathItems).not.toBe(state0.pathItems)
    expect(getFolderOrFail(state1.pathItems, kbkbfstestPath).children).toBe(
      getFolderOrFail(state0.pathItems, kbkbfstestPath).children
    )
  })

  test('pathItemLoaded: reuse old pathItem if new folder remains the same', () => {
    const state1 = reducer(
      state0,
      FsGen.createPathItemLoaded({
        path: kbkbfstestPath,
        pathItem: Constants.makeFolder({
          children: I.Set(['file0', 'folder0']),
          name: 'kbkbfstest',
          prefetchStatus: Constants.makePrefetchInProgress(),
          progress: 'loaded',
        }),
      })
    )
    expect(state1.pathItems).toBe(state0.pathItems)
  })

  test('folderListLoaded: load folder0', () => {
    const stage1 = reducer(
      state0,
      FsGen.createFolderListLoaded({
        path: folder0Path,
        pathItems: I.Map([
          [
            folder0Path,
            Constants.makeFolder({
              children: I.Set(['file1']),
              name: 'folder0',
              prefetchStatus: Constants.prefetchNotStarted,
              progress: 'loaded',
            }),
          ],
        ]),
      })
    )
    expect(stage1.pathItems).not.toBe(state0.pathItems)
    expect(getFolderOrFail(stage1.pathItems, folder0Path).children).toEqual(I.Set(['file1']))
    expect(getFolderOrFail(stage1.pathItems, folder0Path).prefetchStatus).toBe(Constants.prefetchNotStarted)
  })

  test('folderListLoaded: folder0 prefetch complete', () => {
    const stage1 = reducer(
      state0,
      FsGen.createFolderListLoaded({
        path: folder0Path,
        pathItems: I.Map([
          [
            folder0Path,
            Constants.makeFolder({
              name: 'folder0',
              prefetchStatus: Constants.prefetchComplete,
            }),
          ],
        ]),
      })
    )
    expect(stage1.pathItems).not.toBe(state0.pathItems)
    expect(getFolderOrFail(stage1.pathItems, folder0Path).prefetchStatus).toBe(Constants.prefetchComplete)
  })
})
