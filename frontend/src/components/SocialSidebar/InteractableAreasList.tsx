import { Box, Container, Heading, List, ListItem, OrderedList } from '@chakra-ui/react';
import React from 'react';
import {
  CONVERSATION_AREA_TYPE,
  GAME_AREA_TYPE,
  GenericInteractableAreaController,
  VIEWING_AREA_TYPE,
  useInteractableAreaFriendlyName,
  useInteractableAreaOccupants,
} from '../../classes/interactable/InteractableAreaController';
import PlayerName from './PlayerName';
import { useActiveInteractableAreas } from '../../classes/TownController';

/**
 * A react component displaying the information of a single InteractleAreaController.
 * @param areaController controller whose information is being shown
 * @returns A ListItem showing all the information required of the InteractableAreasList spec
 */
export function InteractableAreasListItem<T extends GenericInteractableAreaController>({
  areaController,
}: {
  areaController: T;
}) {
  const friendlyName = useInteractableAreaFriendlyName(areaController);
  const occupants = useInteractableAreaOccupants(areaController);

  return (
    <ListItem>
      <Heading as='h4'>{friendlyName}</Heading>
      <List>
        {occupants.map(occupant => {
          return (
            <ListItem key={occupant.id}>
              <PlayerName player={occupant} />
            </ListItem>
          );
        })}
      </List>
    </ListItem>
  );
}

/**
 * A react component that displays a list of all active interactable areas in the town.
 * The list is grouped by type of interactable area, with those groups sorted alphabetically
 * by the type name. Within each group, the areas are sorted first by the number of occupants
 * in the area, and then by the name of the area (alphanumerically).
 *
 * The list of interactable areas is represented as an ordered list, with each list item
 * containing the name of the area (in an H4 heading), and then a list of the occupants of the area, where
 * each occupant is shown as a PlayerName component.
 *
 * @returns A list of all active interactable areas in the town as per above spec
 */
export default function InteractableAreasList(): JSX.Element {
  const interactableAreas = useActiveInteractableAreas();

  const areaComparator = (
    a: GenericInteractableAreaController,
    b: GenericInteractableAreaController,
  ) => {
    if (a.occupants.length !== b.occupants.length) {
      return b.occupants.length - a.occupants.length;
    }
    return a.friendlyName.localeCompare(b.friendlyName, 'en', { numeric: true });
  };

  return (
    <Box>
      {interactableAreas.length > 0 ? (
        <Heading as='h2' fontSize='l'>
          Active Areas:
          {interactableAreas.filter(area => area.type === CONVERSATION_AREA_TYPE).length > 0 ? (
            <Container>
              <Heading as='h3'>{CONVERSATION_AREA_TYPE}s</Heading>
              <OrderedList>
                {interactableAreas
                  .filter(area => area.type === CONVERSATION_AREA_TYPE)
                  .sort(areaComparator)
                  .map(conversation => (
                    <InteractableAreasListItem
                      key={conversation.id}
                      areaController={conversation}
                    />
                  ))}
              </OrderedList>
            </Container>
          ) : (
            ''
          )}
          {interactableAreas.filter(area => area.type === GAME_AREA_TYPE).length > 0 ? (
            <Container>
              <Heading as='h3'>{GAME_AREA_TYPE}s</Heading>
              <OrderedList>
                {interactableAreas
                  .filter(area => area.type === GAME_AREA_TYPE)
                  .sort(areaComparator)
                  .map(game => (
                    <InteractableAreasListItem key={game.id} areaController={game} />
                  ))}
              </OrderedList>
            </Container>
          ) : (
            ''
          )}
          {interactableAreas.filter(area => area.type === VIEWING_AREA_TYPE).length > 0 ? (
            <Container>
              <Heading as='h3'>{VIEWING_AREA_TYPE}s</Heading>
              <OrderedList>
                {interactableAreas
                  .filter(area => area.type === VIEWING_AREA_TYPE)
                  .sort(areaComparator)
                  .map(viewing => (
                    <InteractableAreasListItem key={viewing.id} areaController={viewing} />
                  ))}
              </OrderedList>
            </Container>
          ) : (
            ''
          )}
        </Heading>
      ) : (
        <Heading as='h2'>No active areas</Heading>
      )}
    </Box>
  );
}
