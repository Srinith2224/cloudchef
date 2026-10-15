import React from 'react';
import { Link } from 'react-router-dom';
import Page from '../components/Page';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';

export default function NotFound() {
  return (
    <Page title="Page not found">
      <EmptyState icon="soup_kitchen" title="This page isn’t on the menu" action={<Link to="/explore" className="btn btn-primary"><Icon name="travel_explore" />Browse recipes</Link>}>
        The link may be old or mistyped.
      </EmptyState>
    </Page>
  );
}
