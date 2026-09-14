import type { Metadata } from 'next';
import { Collection } from './Collection';
import './collection.css';

export const metadata: Metadata = { title: 'Beam — Social artwork collection', robots: { index: false, follow: false } };
export default function Page({ searchParams }: { searchParams: { native?: string } }) { return <Collection native={searchParams.native === '1'} />; }
