import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import React, { Fragment, useEffect } from 'react';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostNav extends Post {
  uid: string;
}

interface PostProps {
  post: Post;
  next?: PostNav;
  prev?: PostNav;
  preview: boolean;
}

export default function Post({
  post,
  next,
  prev,
  preview,
}: PostProps): JSX.Element {
  const router = useRouter();
  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  return (
    <main>
      <Head>
        <title>{post.data.title} / spacetraveling</title>
      </Head>
      <div className={commonStyles.container}>
        <Header />
      </div>
      <section
        className={styles.background}
        style={{
          backgroundImage: `url(${post.data.banner.url})`,
        }}
      />
      <div className={commonStyles.container}>
        <article className={styles.article}>
          <h1 className={styles.title}>{post.data.title}</h1>
          <div className={commonStyles.info}>
            <time>
              <FiCalendar size={20} />
              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </time>
            <span>
              <FiUser size={20} />
              {post.data.author}
            </span>
            <span>
              <FiClock size={20} />
              {Math.ceil(
                post.data.content.reduce((acc, item) => {
                  return (
                    acc +
                    RichText.asText(item.body).split(/\b\S+\b/g).length +
                    (item.heading?.split(/\b\S+\b/g).length || 0)
                  );
                }, 0) / 200
              )}{' '}
              min
            </span>
          </div>
          {post.last_publication_date && (
            <div className={styles.edited}>
              {format(
                new Date(post.last_publication_date),
                "'* editado em' dd MMM yyyy', às' HH:mm",
                {
                  locale: ptBR,
                }
              )}
            </div>
          )}

          {post.data.content.map(content => (
            <Fragment key={content.heading}>
              <h2>{content.heading}</h2>
              <div
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </Fragment>
          ))}
        </article>

        <div className={styles.navigation}>
          <div>
            {prev && (
              <>
                <h3>{prev.data.title}</h3>
                <Link href={`/post/${prev.uid}`}>
                  <a>Post Anterior</a>
                </Link>
              </>
            )}
          </div>
          <div>
            {next && (
              <>
                <h3>{next.data.title}</h3>
                <Link href={`/post/${next.uid}`}>
                  <a>Próximo Post</a>
                </Link>
              </>
            )}
          </div>
        </div>
        <div
          ref={elem => {
            if (!elem) {
              return;
            }
            const scriptElem = document.createElement('script');
            scriptElem.src = 'https://utteranc.es/client.js';
            scriptElem.async = true;
            scriptElem.crossOrigin = 'anonymous';
            scriptElem.setAttribute('repo', 'fitinge/ignite-reactjs-desafio05');
            scriptElem.setAttribute('issue-term', 'pathname');
            scriptElem.setAttribute('theme', 'github-dark');
            elem.innerHTML = '';
            elem.appendChild(scriptElem);
          }}
        />

        {preview && (
          <button
            type="button"
            onClick={() => {
              router.push('/api/exit-preview');
            }}
            className={commonStyles.preview}
          >
            Sair do modo Preview
          </button>
        )}
      </div>
    </main>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: [],
      pageSize: 1,
    }
  );
  const params = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths: params,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;
  const { preview = false } = context;
  const { previewData = {} } = context;
  const { ref } = previewData;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID(
    'posts',
    String(slug),
    ref ? { ref } : null
  );

  const prevPost = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: response?.id,
      orderings: '[document.first_publication_date desc]',
      ref,
    }
  );
  const nextPost = await prismic.query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      pageSize: 1,
      after: response?.id,
      orderings: '[document.first_publication_date]',
      ref,
    }
  );

  return {
    props: {
      post: response,
      prev: prevPost?.results[0] ?? null,
      next: nextPost?.results[0] ?? null,
      preview,
    },
  };
};
