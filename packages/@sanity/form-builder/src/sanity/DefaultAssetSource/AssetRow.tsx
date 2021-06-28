import type {Subscription} from 'rxjs'
import React, {useRef, useState} from 'react'
import styled, {StyledFunction} from 'styled-components'
import {Button, Box, Card, Flex, Stack, Label, Text, Tooltip, Grid} from '@sanity/ui'
import {DocumentIcon, ChevronUpIcon, ChevronDownIcon, LinkIcon, TrashIcon} from '@sanity/icons'
import {useTimeAgo} from '@sanity/base/hooks'
import prettyBytes from 'pretty-bytes'
import {Asset as AssetType} from '@sanity/types'
import {FullscreenSpinner} from '../../components/FullscreenSpinner'
import {versionedClient} from '../versionedClient'
import {AssetUsageDialog} from './AssetUsageDialog'
import {AssetMenu} from './AssetMenu'
import {AssetMenuAction} from './types'
import {DeleteAssetErrorDialog} from './DeleteAssetErrorDialog'
import {formatMimeType} from './utils/mimeType'

interface RowProps {
  isMobile?: boolean
  asset?: AssetType
  isSelected?: boolean
  onClick?: (...args: any[]) => any
  onKeyPress?: (...args: any[]) => any
  onDeleteFinished?: (...args: any[]) => any
}

const CardIconWrapper = styled.span`
  background-color: transparent;
  flex-shrink: 0;
`

// These are here because using vanilla UI components caused a type issue inside of styled-components
const CustomFlex = styled(Flex)``
const CustomText = styled(Text)``
const CustomCard = styled(Card)<RowProps>`
  &:hover-within ${CustomText} {
    --card-muted-fg-color: var(--card-muted-fg-color);
    --card-fg-color: var(--card-muted-fg-color);
  }

  ${(props) =>
    props.isSelected &&
    `
    --card-muted-fg-color: var(--card-bg-color);
    --card-fg-color: var(--card-bg-color);

    ${CustomFlex} {
      --card-muted-fg-color: var(--card-bg-color);
      --card-fg-color: #fff;
    }
  `}
`

const RowButton = styled(Button)<RowProps>`
  box-shadow: none;
  min-width: 0;
  cursor: pointer;
  position: initial;

  &:before,
  &:after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 2;
  }

  &:before {
    z-index: 0;
    pointer-events: none;
    border-radius: 0.1875rem;
  }

  ${(props) =>
    props.isSelected &&
    `
    --card-muted-fg-color: var(--card-bg-color);
    --card-fg-color: var(--card-bg-color);
    
    &:before {
      background-color: var(--card-focus-ring-color);
    }

    ${CardIconWrapper} {
      --card-muted-fg-color: var(--card-bg-color);
    }

    ${CustomFlex} {
      --card-muted-fg-color: var(--card-bg-color);
      --card-fg-color: var(--card-bg-color);
    }
  `}

  ${(props) =>
    !props.isSelected &&
    `
      &:hover:before {
        background-color: var(--card-bg-color);
      }

      &:focus:before {
        background-color: var(--card-code-bg-color);
      }

      &:hover-within:before,
      &:focus-within:before {
        background-color: var(--card-bg-color);
      }
  `}

`

const STYLES_ROW_CARD = {position: 'relative' as any}
const STYLES_ICON_CARD = {flexShrink: 0}
const STYLES_BUTTON_TEXT = {minWidth: 0}
const STYLES_ASSETMENU_WRAPPER = {zIndex: 3}
const DISABLED_DELETE_TITLE = 'Cannot delete current file'

const AssetRow = (props: RowProps) => {
  const deleteRef$ = useRef<Subscription>()
  const [showUsageDialog, setShowUsageDialog] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const {asset, onClick, onKeyPress, onDeleteFinished, isSelected, isMobile} = props
  const {originalFilename, _id, mimeType, size, _createdAt} = asset
  const formattedTime = useTimeAgo(_createdAt, {agoSuffix: true})
  const formattedMimeType = formatMimeType(mimeType)
  const formattedSize = prettyBytes(size)
  const showTooltip = (originalFilename || '').length > 37

  const handleDeleteAsset = () => {
    setIsDeleting(true)

    deleteRef$.current = versionedClient.observable.delete(asset._id).subscribe({
      next: () => {
        setIsDeleting(false)
        onDeleteFinished(asset._id)
      },
      error: (err: Error) => {
        setIsDeleting(false)
        setDeleteError(err)
        // eslint-disable-next-line no-console
        console.error('Could not delete asset', err)
      },
    })
  }

  const handleDialogClose = () => {
    setShowUsageDialog(false)
    setDeleteError(null)
  }

  const handleToggleUsageDialog = () => {
    setShowUsageDialog(true)
  }

  const handleToggleOpen = () => {
    setIsOpen(!isOpen)
  }

  const handleMenuAction = (action: AssetMenuAction) => {
    if (action.type === 'delete') {
      handleDeleteAsset()
    }

    if (action.type === 'showUsage') {
      setShowUsageDialog(true)
    }
  }

  if (isMobile) {
    return (
      <Card borderBottom paddingY={3} style={STYLES_ROW_CARD}>
        <Grid
          columns={4}
          gap={1}
          style={{
            position: 'relative',
            gridTemplateColumns: '1fr 30px',
            opacity: isDeleting ? 0.5 : 1,
          }}
        >
          <RowButton mode="bleed" padding={0} data-id={_id} onClick={onClick}>
            <Flex gap={2} flex={2} align="center">
              <Card as={CardIconWrapper} padding={2} tone="transparent" radius={2}>
                <Text muted size={2} style={STYLES_ICON_CARD}>
                  <DocumentIcon />
                </Text>
              </Card>
              <Text size={1} align="left" textOverflow="ellipsis" style={STYLES_BUTTON_TEXT}>
                {originalFilename}
              </Text>
            </Flex>
          </RowButton>
          <Flex justify="flex-end" align="center" style={STYLES_ASSETMENU_WRAPPER}>
            <Button
              mode="bleed"
              fontSize={1}
              padding={2}
              onClick={handleToggleOpen}
              icon={isOpen ? ChevronUpIcon : ChevronDownIcon}
            />
          </Flex>
        </Grid>
        {isOpen && (
          <>
            <Grid marginTop={3} columns={3} gap={1}>
              <Stack space={2}>
                <Label size={1} muted>
                  Size
                </Label>
                <Text size={1} muted>
                  {formattedSize}
                </Text>
              </Stack>
              <Stack space={2}>
                <Label size={1} muted>
                  Type
                </Label>
                <Text size={1} muted>
                  {formattedMimeType}
                </Text>
              </Stack>
              <Stack space={2}>
                <Label size={1} muted>
                  Date added
                </Label>
                <Text size={1} muted>
                  {formattedTime}
                </Text>
              </Stack>
            </Grid>
            <Stack space={2} marginTop={3}>
              <Button
                fontSize={1}
                tone="default"
                mode="ghost"
                text="Find usages"
                onClick={handleToggleUsageDialog}
                icon={LinkIcon}
              />
              <Button
                fontSize={1}
                tone="critical"
                mode="ghost"
                text="Delete"
                icon={TrashIcon}
                disabled={isSelected}
                title={isSelected ? DISABLED_DELETE_TITLE : 'Delete file'}
                onClick={handleDeleteAsset}
              />
            </Stack>
          </>
        )}
        {showUsageDialog && (
          <AssetUsageDialog
            assetType="file"
            asset={asset}
            onClose={handleDialogClose}
            onDelete={handleDeleteAsset}
          />
        )}
        {deleteError && (
          <DeleteAssetErrorDialog asset={asset} onClose={handleDialogClose} error={deleteError} />
        )}
        {isDeleting && <FullscreenSpinner />}
      </Card>
    )
  }

  return (
    <CustomCard
      borderBottom
      paddingY={1}
      style={STYLES_ROW_CARD}
      radius={0}
      overflow={'hidden'}
      isSelected={isSelected}
    >
      <Grid
        columns={4}
        gap={1}
        data-id={_id}
        paddingY={1}
        paddingRight={1}
        style={{
          position: 'relative',
          gridTemplateColumns: '3fr 1fr 1fr 2fr 30px',
          opacity: isDeleting ? 0.5 : 1,
        }}
      >
        <RowButton
          mode="bleed"
          data-id={_id}
          onClick={onClick}
          padding={0}
          onKeyPress={onKeyPress}
          title={`Select the file ${originalFilename}`}
          isSelected={isSelected}
        >
          <CustomFlex
            gap={2}
            flex={2}
            paddingRight={1}
            align="center"
            onClick={onClick}
            onKeyPress={onKeyPress}
            data-id={_id}
            title={`Select the file ${originalFilename}`}
          >
            <Card
              as={CardIconWrapper}
              padding={2}
              tone="transparent"
              radius={2}
              style={STYLES_ICON_CARD}
            >
              <Text muted size={2}>
                <DocumentIcon />
              </Text>
            </Card>
            {showTooltip && (
              <Tooltip
                content={
                  <Box padding={2}>
                    <Text muted size={1}>
                      {originalFilename}
                    </Text>
                  </Box>
                }
                fallbackPlacements={['right', 'left']}
                placement="top"
                portal
              >
                <Text size={1} align="left" textOverflow="ellipsis" style={STYLES_BUTTON_TEXT}>
                  {originalFilename}
                </Text>
              </Tooltip>
            )}
            {!showTooltip && (
              <Text size={1} align="left" textOverflow="ellipsis" style={STYLES_BUTTON_TEXT}>
                {originalFilename}
              </Text>
            )}
          </CustomFlex>
        </RowButton>
        <CustomFlex align="center">
          <Text size={1} muted>
            {formattedSize}
          </Text>
        </CustomFlex>
        <CustomFlex align="center">
          <Text size={1} muted>
            {formattedMimeType}
          </Text>
        </CustomFlex>
        <CustomFlex align="center">
          <Text as="time" size={1} muted dateTime={_createdAt}>
            {formattedTime}
          </Text>
        </CustomFlex>
        <CustomFlex justify="flex-end" align="center" style={STYLES_ASSETMENU_WRAPPER}>
          <AssetMenu
            border={false}
            disabledDeleteTitle={DISABLED_DELETE_TITLE}
            isSelected={isSelected}
            onAction={handleMenuAction}
          />
        </CustomFlex>
      </Grid>
      {showUsageDialog && (
        <AssetUsageDialog
          assetType="file"
          asset={asset}
          onClose={handleDialogClose}
          onDelete={handleDeleteAsset}
        />
      )}
      {deleteError && (
        <DeleteAssetErrorDialog asset={asset} onClose={handleDialogClose} error={deleteError} />
      )}
      {isDeleting && <FullscreenSpinner />}
    </CustomCard>
  )
}

export default AssetRow
